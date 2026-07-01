import type { AISummary, AISummaryTheme } from "@brainstorm/shared";
import { sql } from "drizzle-orm";
import { env } from "../../env.js";
import { db } from "../../db/client.js";
import { makeError } from "../../shared/http.js";
import { getRoomRowBySlug } from "./room.service.js";
import { adjectives, objects, places } from "./room.words.js";

const GEMINI_GENERATE_CONTENT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type SummaryIdeaRow = {
  text: string;
  heart_count: string | number;
};

type GeminiTextPart = {
  text?: unknown;
};

type GeminiStepContent = string | GeminiTextPart;

type GeminiResponse = {
  output_text?: unknown;
  outputText?: unknown;
  response?: {
    text?: unknown;
  };
  steps?: Array<{
    type?: unknown;
    content?: GeminiStepContent | GeminiStepContent[];
  }>;
  candidates?: Array<{
    content?: {
      parts?: GeminiTextPart[];
    };
  }>;
};

type FetchLike = typeof fetch;

const MAX_THEMES = 5;
const THEME_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "our",
  "the",
  "to",
  "we",
  "with"
]);

function isGeneratedRoomTitle(title: string): boolean {
  const words = title.trim().split(/\s+/);
  if (words.length !== 3) {
    return false;
  }
  return adjectives.includes(words[0] as (typeof adjectives)[number])
    && objects.includes(words[1] as (typeof objects)[number])
    && places.includes(words[2] as (typeof places)[number]);
}

function buildSummaryPrompt(roomTitle: string, ideas: SummaryIdeaRow[]): string {
  const ideaLines = ideas
    .map((idea, index) => `${index + 1}. ${idea.text.trim()} (${Number(idea.heart_count)} hearts)`)
    .join("\n");
  const titleContext = isGeneratedRoomTitle(roomTitle)
    ? `Room title: "${roomTitle}" (random default title; treat as weak context only)`
    : `Room topic/title: "${roomTitle}" (user-provided context; use it to frame the summary when relevant)`;

  return [
    "Summarize this brainstorming board for participants who need quick, actionable insight.",
    titleContext,
    "Use the idea text and heart counts to identify the strongest themes/categories, notable high-interest ideas, and any useful tensions or gaps.",
    `Return strict JSON only with this shape: {"themes":[{"label":"Theme name","count":3}],"prose":"Concise summary text"}.`,
    "Do not wrap the JSON in markdown fences or include any text before or after the JSON object.",
    `Include up to ${MAX_THEMES} themes. Theme count is the number of ideas that belong to that theme, not total hearts.`,
    "Keep labels short, use title case, avoid invented details, and keep prose to 2-4 short paragraphs or bullets.",
    "The prose may use **bold** for important phrases, but do not use markdown tables.",
    "",
    "Ideas:",
    ideaLines
  ].join("\n");
}

function extractSummaryText(data: GeminiResponse): string {
  const directText = data.output_text ?? data.outputText ?? data.response?.text;
  if (typeof directText === "string" && directText.trim()) {
    return directText.trim();
  }

  for (const step of [...(data.steps ?? [])].reverse()) {
    const contentItems = Array.isArray(step.content) ? step.content : step.content ? [step.content] : [];
    const stepText = contentItems
      .map((content) => {
        if (typeof content === "string") {
          return content;
        }
        return typeof content.text === "string" ? content.text : "";
      })
      .join("")
      .trim();

    if (stepText) {
      return stepText;
    }
  }

  const candidateText = data.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (candidateText) {
    return candidateText;
  }

  throw makeError("ai_summary_failed", "Could not generate an AI summary right now.", 502);
}

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function normalizeThemes(value: unknown): AISummaryTheme[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((theme) => {
      if (!theme || typeof theme !== "object") {
        return undefined;
      }
      const label = "label" in theme ? theme.label : undefined;
      const count = "count" in theme ? theme.count : undefined;
      const normalizedCount = typeof count === "number" ? count : typeof count === "string" ? Number(count) : NaN;

      if (typeof label !== "string" || !label.trim() || !Number.isFinite(normalizedCount) || normalizedCount <= 0) {
        return undefined;
      }

      return {
        label: label.trim().slice(0, 48),
        count: Math.round(normalizedCount)
      };
    })
    .filter((theme): theme is AISummaryTheme => Boolean(theme))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_THEMES);
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(" ");
}

function buildFallbackThemes(ideas: SummaryIdeaRow[]): AISummaryTheme[] {
  const counts = new Map<string, number>();

  for (const idea of ideas) {
    const ideaWords = new Set(
      idea.text
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((word) => word.length > 3 && !THEME_STOP_WORDS.has(word)) ?? []
    );

    for (const word of ideaWords) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_THEMES)
    .map(([label, count]) => ({ label: toTitleCase(label), count }));
}

function parseGeminiErrorMessage(body: string): string | undefined {
  try {
    const data = JSON.parse(body) as { error?: { message?: unknown } };
    return typeof data.error?.message === "string" ? data.error.message : undefined;
  } catch {
    return undefined;
  }
}

function buildQuotaMessage(body: string): string {
  const message = parseGeminiErrorMessage(body);
  const retryMatch = message?.match(/retry in ([^.]+(?:\.\d+)?s)/i);
  if (retryMatch?.[1]) {
    return `AI summary quota reached. Please try again in ${retryMatch[1]}.`;
  }
  return "AI summary quota reached. Please try again shortly.";
}

function parseSummary(rawText: string): AISummary {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonPayload(rawText));
  } catch {
    throw makeError("ai_summary_failed", "Could not generate an AI summary right now.", 502);
  }

  if (!parsed || typeof parsed !== "object") {
    throw makeError("ai_summary_failed", "Could not generate an AI summary right now.", 502);
  }

  const prose = "prose" in parsed ? parsed.prose : undefined;
  if (typeof prose !== "string" || !prose.trim()) {
    throw makeError("ai_summary_failed", "Could not generate an AI summary right now.", 502);
  }

  return {
    prose: prose.trim(),
    themes: normalizeThemes("themes" in parsed ? parsed.themes : undefined)
  };
}

async function fetchGeminiSummary(roomTitle: string, ideas: SummaryIdeaRow[], apiKey: string, fetcher: FetchLike = fetch): Promise<AISummary> {
  let response: Response;
  try {
    response = await fetcher(`${GEMINI_GENERATE_CONTENT_BASE_URL}/models/${env.GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        store: false,
        contents: [
          {
            parts: [{ text: buildSummaryPrompt(roomTitle, ideas) }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json",
          response_schema: {
            type: "OBJECT",
            properties: {
              themes: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    label: { type: "STRING" },
                    count: { type: "INTEGER" }
                  },
                  required: ["label", "count"]
                }
              },
              prose: { type: "STRING" }
            },
            required: ["themes", "prose"]
          }
        }
      })
    });
  } catch (error) {
    console.error("AI summary Gemini request failed", error);
    throw makeError("ai_summary_failed", "Could not generate an AI summary right now.", 502);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("AI summary Gemini returned a non-OK response", {
      status: response.status,
      statusText: response.statusText,
      body: body.slice(0, 800)
    });
    if (response.status === 429) {
      throw makeError("ai_summary_rate_limited", buildQuotaMessage(body), 429);
    }
    throw makeError("ai_summary_failed", "Could not generate an AI summary right now.", 502);
  }

  const rawText = extractSummaryText((await response.json()) as GeminiResponse);
  try {
    const summary = parseSummary(rawText);
    return {
      prose: summary.prose,
      themes: summary.themes.length > 0 ? summary.themes : buildFallbackThemes(ideas)
    };
  } catch {
    return {
      prose: rawText,
      themes: buildFallbackThemes(ideas)
    };
  }
}

export async function generateAISummary(roomSlug: string, fetcher: FetchLike = fetch): Promise<AISummary> {
  if (!env.GEMINI_API_KEY) {
    throw makeError("ai_summary_unavailable", "AI summaries are not configured for this server.", 503);
  }

  const room = await getRoomRowBySlug(roomSlug);
  const ideaRows = await db.execute<SummaryIdeaRow>(sql`
    select
      i.text,
      count(h.idea_id) as heart_count
    from ideas i
    left join idea_hearts h on h.idea_id = i.id
    where i.room_id = ${room.id}
    group by i.id
    order by count(h.idea_id) desc, i.created_at asc
  `);

  if (ideaRows.length === 0) {
    throw makeError("empty_board", "Add at least one idea before generating an AI summary.", 400);
  }

  return fetchGeminiSummary(room.title, ideaRows, env.GEMINI_API_KEY, fetcher);
}

export const aiSummaryTestUtils = {
  buildSummaryPrompt,
  buildFallbackThemes,
  buildQuotaMessage,
  extractSummaryText,
  isGeneratedRoomTitle,
  parseSummary,
  fetchGeminiSummary
};
