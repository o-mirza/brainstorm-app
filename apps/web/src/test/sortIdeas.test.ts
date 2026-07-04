import type { Idea } from "@brainstorm/shared";
import { describe, expect, it } from "vitest";
import { sortIdeas } from "../lib/sortIdeas";

function idea(id: string, heartCount: number, createdAt: string): Idea {
  return {
    id,
    roomId: "r_room",
    text: id,
    heartCount,
    heartedByMe: false,
    commentCount: 0,
    createdAt,
    updatedAt: createdAt
  };
}

describe("sortIdeas", () => {
  it("sorts by heart count descending and creation time ascending", () => {
    const sorted = sortIdeas([
      idea("late-two", 2, "2026-06-26T10:03:00.000Z"),
      idea("one", 1, "2026-06-26T10:01:00.000Z"),
      idea("early-two", 2, "2026-06-26T10:00:00.000Z")
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["early-two", "late-two", "one"]);
  });
});
