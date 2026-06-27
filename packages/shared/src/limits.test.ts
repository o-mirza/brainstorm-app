import { describe, expect, it } from "vitest";
import { IDEA_TEXT_MAX_LENGTH, RECENT_ROOMS_LIMIT, ROOM_TITLE_MAX_LENGTH } from "./limits.js";

describe("shared limits", () => {
  it("keeps MVP text and recent-room limits aligned with the spec", () => {
    expect(IDEA_TEXT_MAX_LENGTH).toBe(280);
    expect(ROOM_TITLE_MAX_LENGTH).toBe(80);
    expect(RECENT_ROOMS_LIMIT).toBe(20);
  });
});
