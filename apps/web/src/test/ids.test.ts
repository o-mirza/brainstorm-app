import { describe, expect, it } from "vitest";
import { createParticipantId } from "../lib/ids";

describe("createParticipantId", () => {
  it("creates anonymous participant ids with the expected prefix", () => {
    const id = createParticipantId();
    expect(id).toMatch(/^p_[a-z0-9]+$/);
    expect(id.length).toBeLessThanOrEqual(32);
  });
});
