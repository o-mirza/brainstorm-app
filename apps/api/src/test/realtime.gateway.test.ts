import type { RoomSnapshot } from "@brainstorm/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({
  db: {}
}));

vi.mock("../modules/rooms/room.service.js", () => ({
  getRoomBySlug: vi.fn(async (roomSlug: string) => ({
    id: "r_test",
    slug: roomSlug,
    title: "Test room",
    participantPermissions: {
      canViewIdeas: true,
      canAddIdeas: true,
      canHeartIdeas: true,
      canViewHeartCounts: true,
      ideaManagement: "anyone",
      canExportData: true,
      canViewComments: true,
      canAddComments: true,
      commentManagement: "own",
      canGenerateSummary: false,
      canRenameRoom: false,
      canDeleteRoom: false
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  })),
  getRoomSnapshot: vi.fn(async (roomSlug: string, participantId: string, participantCount: number, adminToken?: string) => ({
    room: {
      id: "r_test",
      slug: roomSlug,
      title: "Test room",
      participantPermissions: {
        canViewIdeas: true,
        canAddIdeas: true,
        canHeartIdeas: true,
        canViewHeartCounts: true,
        ideaManagement: "anyone",
        canExportData: true,
        canViewComments: true,
        canAddComments: true,
        commentManagement: "own",
        canGenerateSummary: false,
        canRenameRoom: false,
        canDeleteRoom: false
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    ideas: [],
    participantCount,
    isAdmin: Boolean(adminToken),
    participantId
  }))
}));

import { getRoomSnapshot } from "../modules/rooms/room.service.js";
import { RealtimeGateway } from "../modules/realtime/realtime.gateway.js";

const adminToken = "A".repeat(32);

function createSocket() {
  const sent: unknown[] = [];
  return {
    sent,
    send: (data: string) => {
      sent.push(JSON.parse(data));
    },
    close: vi.fn(),
    on: vi.fn()
  };
}

describe("RealtimeGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("broadcasts fresh participant-specific snapshots for subscribed room clients", async () => {
    const gateway = new RealtimeGateway({} as never);
    const participantSocket = createSocket();
    const adminSocket = createSocket();
    const participantConnectionId = gateway.register(participantSocket);
    const adminConnectionId = gateway.register(adminSocket);

    await gateway.subscribe(participantConnectionId, "abc123", "p_participant1");
    await gateway.subscribe(adminConnectionId, "abc123", "p_adminpart1", adminToken);
    vi.mocked(getRoomSnapshot).mockClear();
    participantSocket.sent.length = 0;
    adminSocket.sent.length = 0;

    await gateway.broadcastRoomSnapshots("abc123");

    expect(getRoomSnapshot).toHaveBeenCalledWith("abc123", "p_participant1", 2, undefined);
    expect(getRoomSnapshot).toHaveBeenCalledWith("abc123", "p_adminpart1", 2, adminToken);
    expect((participantSocket.sent[0] as { type: string; snapshot: RoomSnapshot }).type).toBe("room.snapshot");
    expect((participantSocket.sent[0] as { snapshot: RoomSnapshot }).snapshot.participantCount).toBe(2);
    expect((adminSocket.sent[0] as { snapshot: RoomSnapshot }).snapshot.isAdmin).toBe(true);
  });
});
