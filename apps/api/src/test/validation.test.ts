import { describe, expect, it } from "vitest";
import { ideaTextSchema, participantIdSchema, roomTitleSchema } from "../shared/validation.js";

describe("validation schemas", () => {
  it("trims and accepts valid room titles and ideas", () => {
    expect(roomTitleSchema.parse("  Planning  ")).toBe("Planning");
    expect(ideaTextSchema.parse("  Run weekly demos  ")).toBe("Run weekly demos");
  });

  it("rejects malformed participant ids", () => {
    expect(() => participantIdSchema.parse("user-1")).toThrow();
  });
});
