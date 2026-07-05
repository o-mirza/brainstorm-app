import { describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn()
  }
}));

import { db } from "../db/client.js";
import { canManageParticipantItem, getRoomExportData } from "../modules/rooms/room.service.js";

const mockedDb = vi.mocked(db);

function mockRoomLookup(overrides: Record<string, unknown> = {}) {
  const room = {
    id: "r_1",
    slug: "test-room",
    title: "Test room",
    adminToken: "admin-token",
    participantManagementEnabled: true,
    participantCanViewIdeas: true,
    participantCanAddIdeas: true,
    participantCanHeartIdeas: true,
    participantCanViewHeartCounts: true,
    participantIdeaManagement: "anyone",
    participantCanExportData: true,
    participantCanViewComments: true,
    participantCanAddComments: true,
    participantCommentManagement: "own",
    participantCanGenerateSummary: false,
    participantCanRenameRoom: false,
    participantCanDeleteRoom: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
  const limit = vi.fn().mockResolvedValue([room]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mockedDb.select.mockReturnValue({ from } as never);
}

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

  it("denies participant export when export data permission is disabled", async () => {
    mockedDb.execute.mockReset();
    mockedDb.select.mockReset();
    mockRoomLookup({ participantCanExportData: false });

    await expect(getRoomExportData("test-room", "p_participant1", false)).rejects.toMatchObject({
      code: "admin_required",
      statusCode: 403
    });
    expect(mockedDb.execute).not.toHaveBeenCalled();
  });

  it("allows admin export even when participant export data permission is disabled", async () => {
    mockedDb.execute.mockReset();
    mockedDb.select.mockReset();
    mockRoomLookup({ participantCanExportData: false });
    mockedDb.execute.mockResolvedValue([
      {
        idea_id: "i_1",
        idea_text: "Ship it",
        heart_count: 2,
        idea_created_at: new Date("2026-01-01T00:00:00.000Z"),
        idea_updated_at: new Date("2026-01-01T00:01:00.000Z"),
        comment_id: null,
        comment_text: null,
        comment_created_at: null,
        comment_updated_at: null
      }
    ] as never);

    await expect(getRoomExportData("test-room", "p_participant1", false, "admin-token")).resolves.toEqual([
      {
        ideaId: "i_1",
        ideaText: "Ship it",
        heartCount: 2,
        ideaCreatedAt: "2026-01-01T00:00:00.000Z",
        ideaUpdatedAt: "2026-01-01T00:01:00.000Z",
        commentId: null,
        commentText: null,
        commentCreatedAt: null,
        commentUpdatedAt: null
      }
    ]);
  });

  it("requires comment view permission for comment-inclusive export", async () => {
    mockedDb.execute.mockReset();
    mockedDb.select.mockReset();
    mockRoomLookup({ participantCanViewComments: false });

    await expect(getRoomExportData("test-room", "p_participant1", true)).rejects.toMatchObject({
      code: "admin_required",
      statusCode: 403
    });
    expect(mockedDb.execute).not.toHaveBeenCalled();
  });
});
