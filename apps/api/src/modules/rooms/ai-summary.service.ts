import type { AISummary, AISummaryTheme } from "@brainstorm/shared";
import { createGoogleGenerativeAI as createGoogle } from "@ai-sdk/google";
import { APICallError, generateObject, RetryError } from "ai";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { env } from "../../env.js";
import { db } from "../../db/client.js";
import { makeError } from "../../shared/http.js";
import { getRoomRowBySlug } from "./room.service.js";
import { adjectives, objects, places } from "./room.words.js";

type SummaryIdeaRow = {
  text: string;
  heart_count: string | number;
};

type FetchLike = typeof fetch;

const MAX_THEMES = 5;

const SummarySchema = z.object({
  themes: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(48),
        count: z.number().int().positive()
      })
    )
    .max(MAX_THEMES),
  prose: z.string().trim().min(1)
});

function aiSummaryFailed() {
  return makeError("ai_summary_failed", "Could not generate an AI summary right now.", 502);
}

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
    `Include up to ${MAX_THEMES} themes. Theme count is the number of ideas that belong to that theme, not total hearts.`,
    "Keep labels short, use title case, avoid invented details, and keep prose to 2-4 short paragraphs or bullets.",
    "The prose may use **bold** for important phrases, but do not use markdown tables.",
    "",
    "Ideas:",
    ideaLines
  ].join("\n");
}

function normalizeThemes(themes: z.infer<typeof SummarySchema>["themes"]): AISummaryTheme[] {
  return themes
    .map((theme) => ({
      label: theme.label.trim().slice(0, 48).trim(),
      count: theme.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_THEMES);
}

function buildQuotaMessage(message?: string): string {
  const retryMatch = message?.match(/retry in ([^.]+(?:\.\d+)?s)/i);
  if (retryMatch?.[1]) {
    return `AI summary quota reached. Please try again in ${retryMatch[1]}.`;
  }
  return "AI summary quota reached. Please try again shortly.";
}

function getProviderError(error: unknown): unknown {
  return RetryError.isInstance(error) ? error.lastError : error;
}

function logAISummaryError(error: unknown) {
  const providerError = getProviderError(error);
  if (APICallError.isInstance(providerError)) {
    console.error("AI summary generation failed", {
      statusCode: providerError.statusCode,
      isRetryable: providerError.isRetryable,
      message: providerError.message
    });
    return;
  }

  console.error("AI summary generation failed", error instanceof Error ? error.message : error);
}

async function fetchGeminiSummary(roomTitle: string, ideas: SummaryIdeaRow[], apiKey: string, fetcher: FetchLike = fetch): Promise<AISummary> {
  try {
    const google = createGoogle({ apiKey, fetch: fetcher });
    const result = await generateObject({
      model: google(env.GEMINI_MODEL),
      schema: SummarySchema,
      prompt: buildSummaryPrompt(roomTitle, ideas),
      temperature: 0.2
    });

    return {
      prose: result.object.prose.trim(),
      themes: normalizeThemes(result.object.themes)
    };
  } catch (error) {
    const providerError = getProviderError(error);
    if (APICallError.isInstance(providerError) && providerError.statusCode === 429) {
      throw makeError("ai_summary_rate_limited", buildQuotaMessage(providerError.message), 429);
    }
    logAISummaryError(error);
    throw aiSummaryFailed();
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
  buildQuotaMessage,
  isGeneratedRoomTitle,
  fetchGeminiSummary
};
