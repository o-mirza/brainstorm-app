import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const aiMocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  isAPICallError: vi.fn(),
  isRetryError: vi.fn()
}));

const googleMocks = vi.hoisted(() => ({
  provider: vi.fn(),
  createGoogle: vi.fn()
}));

vi.mock("ai", () => ({
  APICallError: {
    isInstance: aiMocks.isAPICallError
  },
  RetryError: {
    isInstance: aiMocks.isRetryError
  },
  generateObject: aiMocks.generateObject
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: googleMocks.createGoogle
}));

vi.mock("../db/client.js", () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn()
  }
}));

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { aiSummaryTestUtils, generateAISummary } from "../modules/rooms/ai-summary.service.js";

const mockedDb = vi.mocked(db);
const mockedGenerateObject = vi.mocked(generateObject);
const mockedCreateGoogle = vi.mocked(createGoogleGenerativeAI);

function mockRoomLookup(title = "Customer Onboarding") {
  const limit = vi.fn().mockResolvedValue([{ id: "room_1", title }]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mockedDb.select.mockReturnValue({ from } as never);
}

function mockSDKError(error: Error & { statusCode?: number }, options: { retryWrapped?: boolean } = {}) {
  mockedGenerateObject.mockRejectedValue(options.retryWrapped ? { lastError: error } : error);
  aiMocks.isRetryError.mockImplementation((value) => options.retryWrapped && value && typeof value === "object" && "lastError" in value);
  aiMocks.isAPICallError.mockImplementation((value) => value === error);
}

describe("AI summary generation", () => {
  beforeEach(() => {
    mockedDb.execute.mockReset();
    mockedDb.select.mockReset();
    mockedGenerateObject.mockReset();
    mockedCreateGoogle.mockReset();
    googleMocks.provider.mockReset();
    aiMocks.isAPICallError.mockReset();
    aiMocks.isRetryError.mockReset();
    aiMocks.isAPICallError.mockReturnValue(false);
    aiMocks.isRetryError.mockReturnValue(false);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    env.GEMINI_API_KEY = "test-key";
    env.GEMINI_MODEL = "gemini-2.5-flash-lite";
    googleMocks.provider.mockReturnValue("gemini-model");
    mockedCreateGoogle.mockReturnValue(googleMocks.provider as never);
    mockRoomLookup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 503 when Gemini is not configured before DB access", async () => {
    env.GEMINI_API_KEY = undefined;

    await expect(generateAISummary("abc123")).rejects.toMatchObject({
      code: "ai_summary_unavailable",
      statusCode: 503
    });
    expect(mockedDb.select).not.toHaveBeenCalled();
    expect(mockedDb.execute).not.toHaveBeenCalled();
  });

  it("rejects empty rooms with a user-facing 400", async () => {
    mockedDb.execute.mockResolvedValue([] as never);

    await expect(generateAISummary("abc123")).rejects.toMatchObject({
      code: "empty_board",
      message: "Add at least one idea before generating an AI summary.",
      statusCode: 400
    });
  });

  it("maps successful structured summary generation to normalized summary content", async () => {
    const fetcher = vi.fn();
    mockedDb.execute.mockResolvedValue([
      { text: "Assign owners", heart_count: 4 },
      { text: "Track follow-up owners", heart_count: 2 }
    ] as never);
    mockedGenerateObject.mockResolvedValue({
      object: {
        themes: [
          { label: " Ownership ", count: 2 },
          { label: "Follow Up", count: 5 },
          { label: "Very Long Theme Label That Should Be Trimmed To Forty Eight Characters", count: 1 },
          { label: "Enablement", count: 3 },
          { label: "Handoffs", count: 4 }
        ],
        prose: "  Teams want **faster follow-up** and clearer owners.  "
      }
    } as never);

    await expect(generateAISummary("abc123", fetcher as never)).resolves.toEqual({
      themes: [
        { label: "Follow Up", count: 5 },
        { label: "Handoffs", count: 4 },
        { label: "Enablement", count: 3 },
        { label: "Ownership", count: 2 },
        { label: "Very Long Theme Label That Should Be Trimmed To", count: 1 }
      ],
      prose: "Teams want **faster follow-up** and clearer owners."
    });
    expect(mockedCreateGoogle).toHaveBeenCalledWith({ apiKey: "test-key", fetch: fetcher });
    expect(googleMocks.provider).toHaveBeenCalledWith("gemini-2.5-flash-lite");
    expect(mockedGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-model",
        prompt: expect.stringContaining("Assign owners (4 hearts)"),
        temperature: 0.2
      })
    );
  });

  it("caps returned themes to five after sorting by count", async () => {
    mockedDb.execute.mockResolvedValue([{ text: "Clarify owners", heart_count: 3 }] as never);
    mockedGenerateObject.mockResolvedValue({
      object: {
        themes: [
          { label: "One", count: 1 },
          { label: "Six", count: 6 },
          { label: "Three", count: 3 },
          { label: "Five", count: 5 },
          { label: "Two", count: 2 },
          { label: "Four", count: 4 }
        ],
        prose: "Use clearer owners."
      }
    } as never);

    await expect(generateAISummary("abc123")).resolves.toMatchObject({
      themes: [
        { label: "Six", count: 6 },
        { label: "Five", count: 5 },
        { label: "Four", count: 4 },
        { label: "Three", count: 3 },
        { label: "Two", count: 2 }
      ]
    });
  });

  it("maps AI SDK failures to a 502", async () => {
    mockedDb.execute.mockResolvedValue([{ text: "Clarify owners", heart_count: 3 }] as never);
    mockedGenerateObject.mockRejectedValue(new Error("schema validation failed"));

    await expect(generateAISummary("abc123")).rejects.toMatchObject({
      code: "ai_summary_failed",
      message: "Could not generate an AI summary right now.",
      statusCode: 502
    });
  });

  it("maps AI SDK rate limits to a clear 429", async () => {
    const error = new Error("Quota exceeded for metric. Please retry in 57.368331847s.") as Error & { statusCode: number };
    error.statusCode = 429;
    mockedDb.execute.mockResolvedValue([{ text: "Clarify owners", heart_count: 3 }] as never);
    mockSDKError(error);

    await expect(generateAISummary("abc123")).rejects.toMatchObject({
      code: "ai_summary_rate_limited",
      message: "AI summary quota reached. Please try again in 57.368331847s.",
      statusCode: 429
    });
  });

  it("maps retry-wrapped AI SDK rate limits to a clear 429", async () => {
    const error = new Error("Quota exceeded for metric. Please retry in 57.368331847s.") as Error & { statusCode: number };
    error.statusCode = 429;
    mockedDb.execute.mockResolvedValue([{ text: "Clarify owners", heart_count: 3 }] as never);
    mockSDKError(error, { retryWrapped: true });

    await expect(generateAISummary("abc123")).rejects.toMatchObject({
      code: "ai_summary_rate_limited",
      message: "AI summary quota reached. Please try again in 57.368331847s.",
      statusCode: 429
    });
  });

  it("logs retry-wrapped provider failures without dumping the full retry error", async () => {
    const error = new Error("This model is currently experiencing high demand.") as Error & {
      isRetryable: boolean;
      statusCode: number;
    };
    error.statusCode = 503;
    error.isRetryable = true;
    mockedDb.execute.mockResolvedValue([{ text: "Clarify owners", heart_count: 3 }] as never);
    mockSDKError(error, { retryWrapped: true });

    await expect(generateAISummary("abc123")).rejects.toMatchObject({
      code: "ai_summary_failed",
      statusCode: 502
    });
    expect(console.error).toHaveBeenCalledWith("AI summary generation failed", {
      statusCode: 503,
      isRetryable: true,
      message: "This model is currently experiencing high demand."
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
