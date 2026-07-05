import { describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({
  db: {}
}));

import { canManageParticipantItem } from "../modules/rooms/room.service.js";

describe("management permission levels", () => {
  it("denies all participant management when set to none", () => {
    expect(canManageParticipantItem("none", "participant_1", "participant_1")).toBe(false);
    expect(canManageParticipantItem("none", "participant_2", "participant_1")).toBe(false);
  });

  it("allows own management only for matching participants", () => {
    expect(canManageParticipantItem("own", "participant_1", "participant_1")).toBe(true);
    expect(canManageParticipantItem("own", "participant_2", "participant_1")).toBe(false);
  });

  it("allows anyone management for own and other participant items", () => {
    expect(canManageParticipantItem("anyone", "participant_1", "participant_1")).toBe(true);
    expect(canManageParticipantItem("anyone", "participant_2", "participant_1")).toBe(true);
  });
});
