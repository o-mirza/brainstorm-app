import type { Idea } from "@brainstorm/shared";
import { describe, expect, it } from "vitest";
import { serializeIdeasCsv } from "../lib/ideasCsv";

function idea(overrides: Partial<Idea>): Idea {
  return {
    id: "idea_1",
    roomId: "room_1",
    text: "Plain idea",
    heartCount: 0,
    heartedByMe: false,
    commentCount: 0,
    createdAt: "2026-06-26T10:00:00.000Z",
    updatedAt: "2026-06-26T10:01:00.000Z",
    ...overrides
  };
}

describe("serializeIdeasCsv", () => {
  it("serializes normal idea text", () => {
    expect(serializeIdeasCsv([idea({ text: "Launch the beta", heartCount: 3 })])).toBe(
      [
        "Idea,Hearts,Created At,Updated At",
        "Launch the beta,3,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z"
      ].join("\r\n")
    );
  });

  it("escapes commas, quotes, and multiline text", () => {
    expect(serializeIdeasCsv([idea({ text: 'One, "two"\nand three' })])).toBe(
      [
        "Idea,Hearts,Created At,Updated At",
        '"One, ""two""\nand three",0,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z'
      ].join("\r\n")
    );
  });

  it("serializes zero and multiple heart counts", () => {
    expect(serializeIdeasCsv([idea({ text: "Zero", heartCount: 0 }), idea({ text: "Many", heartCount: 12 })])).toBe(
      [
        "Idea,Hearts,Created At,Updated At",
        "Zero,0,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z",
        "Many,12,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z"
      ].join("\r\n")
    );
  });

  it("keeps the column order stable", () => {
    const [header] = serializeIdeasCsv([idea({})]).split("\r\n");

    expect(header).toBe("Idea,Hearts,Created At,Updated At");
  });
});
