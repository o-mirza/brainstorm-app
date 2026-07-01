import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { aiSummaryTestUtils, generateAISummary } from "../modules/rooms/ai-summary.service.js";

vi.mock("../db/client.js", () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn()
  }
}));

const mockedDb = vi.mocked(db);

function mockRoomLookup() {
  const limit = vi.fn().mockResolvedValue([{ id: "room_1", title: "Customer Onboarding" }]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mockedDb.select.mockReturnValue({ from } as never);
}

describe("AI summary generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.GEMINI_API_KEY = "test-key";
    env.GEMINI_MODEL = "gemini-2.5-flash-lite";
    mockRoomLookup();
  });

  it("returns 503 when Gemini is not configured", async () => {
    env.GEMINI_API_KEY = undefined;

    await expect(generateAISummary("abc123")).rejects.toMatchObject({
      code: "ai_summary_unavailable",
      statusCode: 503
    });
    expect(mockedDb.select).not.toHaveBeenCalled();
  });

  it("rejects empty rooms with a user-facing 400", async () => {
    mockedDb.execute.mockResolvedValue([] as never);

    await expect(generateAISummary("abc123")).rejects.toMatchObject({
      code: "empty_board",
      message: "Add at least one idea before generating an AI summary.",
      statusCode: 400
    });
  });

  it("maps a successful Gemini response to structured summary content", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        steps: [
          {
            type: "model_output",
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  themes: [
                    { label: "Follow Up", count: 3 },
                    { label: "Ownership", count: "2" }
                  ],
                  prose: "Teams want **faster follow-up** and clearer owners."
                })
              }
            ]
          }
        ]
      })
    });

    await expect(
      aiSummaryTestUtils.fetchGeminiSummary("Customer Onboarding", [{ text: "Assign owners", heart_count: 4 }], "test-key", fetcher as never)
    ).resolves.toEqual({
      themes: [
        { label: "Follow Up", count: 3 },
        { label: "Ownership", count: 2 }
      ],
      prose: "Teams want **faster follow-up** and clearer owners."
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=test-key",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json"
        }),
        body: expect.stringContaining('"contents"')
      })
    );
  });

  it("accepts fenced JSON from Gemini", () => {
    expect(
      aiSummaryTestUtils.parseSummary(`\`\`\`json
{"themes":[{"label":"Speed","count":2}],"prose":"Move faster."}
\`\`\``)
    ).toEqual({
      themes: [{ label: "Speed", count: 2 }],
      prose: "Move faster."
    });
  });

  it("falls back to raw prose and local themes when Gemini returns markdown instead of JSON", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        output_text: "**Owners** need clearer follow-up.\n\n- Assign owners\n- Track follow-up"
      })
    });

    await expect(
      aiSummaryTestUtils.fetchGeminiSummary(
        "Customer Onboarding",
        [
          { text: "Assign owners", heart_count: 4 },
          { text: "Track follow-up owners", heart_count: 2 }
        ],
        "test-key",
        fetcher as never
      )
    ).resolves.toEqual({
      prose: "**Owners** need clearer follow-up.\n\n- Assign owners\n- Track follow-up",
      themes: [
        { label: "Owners", count: 2 },
        { label: "Assign", count: 1 },
        { label: "Follow", count: 1 },
        { label: "Track", count: 1 }
      ]
    });
  });

  it("fills theme bars locally when structured Gemini output has no valid themes", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        output_text: JSON.stringify({
          themes: [],
          prose: "Teams need clearer owners."
        })
      })
    });

    await expect(
      aiSummaryTestUtils.fetchGeminiSummary("Customer Onboarding", [{ text: "Clarify owners", heart_count: 3 }], "test-key", fetcher as never)
    ).resolves.toEqual({
      prose: "Teams need clearer owners.",
      themes: [
        { label: "Clarify", count: 1 },
        { label: "Owners", count: 1 }
      ]
    });
  });

  it("returns a clear 429 when Gemini quota is exhausted", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          error: {
            message: "Quota exceeded for metric. Please retry in 57.368331847s."
          }
        })
      )
    });

    await expect(
      aiSummaryTestUtils.fetchGeminiSummary("Customer Onboarding", [{ text: "Clarify owners", heart_count: 3 }], "test-key", fetcher as never)
    ).rejects.toMatchObject({
      code: "ai_summary_rate_limited",
      message: "AI summary quota reached. Please try again in 57.368331847s.",
      statusCode: 429
    });
  });

  it("marks generated titles as weak context and custom titles as user context", () => {
    expect(aiSummaryTestUtils.isGeneratedRoomTitle("Wobbly Pencil Lab")).toBe(true);
    expect(aiSummaryTestUtils.isGeneratedRoomTitle("Customer Onboarding")).toBe(false);

    expect(aiSummaryTestUtils.buildSummaryPrompt("Wobbly Pencil Lab", [{ text: "Assign owners", heart_count: 1 }])).toContain(
      "random default title; treat as weak context only"
    );
    expect(aiSummaryTestUtils.buildSummaryPrompt("Customer Onboarding", [{ text: "Assign owners", heart_count: 1 }])).toContain(
      "user-provided context"
    );
  });
});
