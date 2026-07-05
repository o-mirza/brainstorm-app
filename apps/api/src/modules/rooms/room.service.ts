import type { Idea, ManagementPermission, ParticipantPermissions, Room, RoomExportRow, RoomSnapshot, SharedIdea } from "@brainstorm/shared";
import { defaultParticipantPermissions } from "@brainstorm/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { ideas, rooms } from "../../db/schema.js";
import { createRoomAdminToken, createRoomId } from "../../shared/ids.js";
import { makeError, toIso } from "../../shared/http.js";
import { createRoomTitle } from "./room.name.js";
import { generateRoomSlug } from "./room.slug.js";

type RoomRow = typeof rooms.$inferSelect;
type BooleanPermission = Exclude<keyof ParticipantPermissions, "ideaManagement" | "commentManagement">;

type IdeaProjectionRow = {
  id: string;
  room_id: string;
  participant_id: string | null;
  text: string;
  heart_count: string | number;
  hearted_by_me: boolean;
  comment_count: string | number;
  created_at: Date;
  updated_at: Date;
};

type ExportProjectionRow = {
  idea_id: string;
  idea_text: string;
  heart_count: string | number;
  idea_created_at: Date;
  idea_updated_at: Date;
  comment_id: string | null;
  comment_text: string | null;
  comment_created_at: Date | null;
  comment_updated_at: Date | null;
};

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    participantPermissions: {
      canViewIdeas: row.participantCanViewIdeas,
      canAddIdeas: row.participantCanAddIdeas,
      canHeartIdeas: row.participantCanHeartIdeas,
      canViewHeartCounts: row.participantCanViewHeartCounts,
      ideaManagement: row.participantIdeaManagement,
      canExportData: row.participantCanExportData,
      canViewComments: row.participantCanViewComments,
      canAddComments: row.participantCanAddComments,
      commentManagement: row.participantCommentManagement,
      canGenerateSummary: row.participantCanGenerateSummary,
      canRenameRoom: row.participantCanRenameRoom,
      canDeleteRoom: row.participantCanDeleteRoom
    },
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function mapIdea(row: IdeaProjectionRow): Idea {
  return {
    id: row.id,
    roomId: row.room_id,
    participantId: row.participant_id,
    text: row.text,
    heartCount: Number(row.heart_count),
    heartedByMe: row.hearted_by_me,
    commentCount: Number(row.comment_count),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export function permissionsForRoom(row: RoomRow): ParticipantPermissions {
  return mapRoom(row).participantPermissions;
}

export function toSharedIdea(idea: Idea): SharedIdea {
  const { heartedByMe: _heartedByMe, ...shared } = idea;
  return shared;
}

export function redactIdeaForParticipant(idea: Idea, room: RoomRow, adminToken?: string): Idea {
  if (isRoomAdmin(room, adminToken)) {
    return idea;
  }
  return {
    ...idea,
    heartCount: room.participantCanViewHeartCounts ? idea.heartCount : 0,
    commentCount: room.participantCanViewComments ? idea.commentCount : 0
  };
}

export async function createRoom(): Promise<{ room: Room; adminToken: string }> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const adminToken = createRoomAdminToken();
    const participantPermissions = defaultParticipantPermissions();
    const [room] = await db
      .insert(rooms)
      .values({
        id: createRoomId(),
        slug: generateRoomSlug(),
        title: createRoomTitle(),
        adminToken,
        participantManagementEnabled: true,
        participantCanViewIdeas: participantPermissions.canViewIdeas,
        participantCanAddIdeas: participantPermissions.canAddIdeas,
        participantCanHeartIdeas: participantPermissions.canHeartIdeas,
        participantCanViewHeartCounts: participantPermissions.canViewHeartCounts,
        participantIdeaManagement: participantPermissions.ideaManagement,
        participantCanExportData: participantPermissions.canExportData,
        participantCanViewComments: participantPermissions.canViewComments,
        participantCanAddComments: participantPermissions.canAddComments,
        participantCommentManagement: participantPermissions.commentManagement,
        participantCanGenerateSummary: participantPermissions.canGenerateSummary,
        participantCanRenameRoom: participantPermissions.canRenameRoom,
        participantCanDeleteRoom: participantPermissions.canDeleteRoom,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoNothing({ target: rooms.slug })
      .returning();

    if (room) {
      return { room: mapRoom(room), adminToken };
    }
  }

  throw makeError("room_slug_collision", "Could not create a unique room.", 500);
}

export async function getRoomBySlug(roomSlug: string): Promise<Room> {
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, roomSlug)).limit(1);
  if (!room) {
    throw makeError("room_not_found", "Room does not exist.", 404);
  }
  return mapRoom(room);
}

export async function getRoomRowBySlug(roomSlug: string): Promise<RoomRow> {
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, roomSlug)).limit(1);
  if (!room) {
    throw makeError("room_not_found", "Room does not exist.", 404);
  }
  return room;
}

export async function getIdeaProjection(ideaId: string, participantId: string): Promise<Idea> {
  const rows = await db.execute<IdeaProjectionRow>(sql`
    select
      i.id,
      i.room_id,
      i.participant_id,
      i.text,
      count(distinct h.participant_id) as heart_count,
      exists(
        select 1 from idea_hearts mine
        where mine.idea_id = i.id and mine.participant_id = ${participantId}
      ) as hearted_by_me,
      count(distinct c.id) as comment_count,
      i.created_at,
      i.updated_at
    from ideas i
    left join idea_hearts h on h.idea_id = i.id
    left join comments c on c.idea_id = i.id
    where i.id = ${ideaId}
    group by i.id
    limit 1
  `);

  const row = rows[0];
  if (!row) {
    throw makeError("idea_not_found", "Idea does not exist.", 404);
  }
  return mapIdea(row);
}

export async function getRoomSnapshot(
  roomSlug: string,
  participantId: string,
  participantCount: number,
  adminToken?: string
): Promise<RoomSnapshot> {
  const roomRow = await getRoomRowBySlug(roomSlug);
  const ideaRows = await db.execute<IdeaProjectionRow>(sql`
    select
      i.id,
      i.room_id,
      i.participant_id,
      i.text,
      count(distinct h.participant_id) as heart_count,
      exists(
        select 1 from idea_hearts mine
        where mine.idea_id = i.id and mine.participant_id = ${participantId}
      ) as hearted_by_me,
      count(distinct c.id) as comment_count,
      i.created_at,
      i.updated_at
    from ideas i
    left join idea_hearts h on h.idea_id = i.id
    left join comments c on c.idea_id = i.id
    where i.room_id = ${roomRow.id}
      and (${isRoomAdmin(roomRow, adminToken)} or ${roomRow.participantCanViewIdeas} or i.participant_id = ${participantId})
    group by i.id
    order by count(distinct h.participant_id) desc, i.created_at asc
  `);

  return {
    room: mapRoom(roomRow),
    ideas: ideaRows.map(mapIdea).map((idea) => redactIdeaForParticipant(idea, roomRow, adminToken)),
    participantCount,
    isAdmin: isRoomAdmin(roomRow, adminToken)
  };
}

export function isRoomAdmin(room: RoomRow, adminToken: string | undefined): boolean {
  return Boolean(adminToken && adminToken === room.adminToken);
}

export function canManageParticipantItem(level: ManagementPermission, ownerParticipantId: string | null, participantId: string): boolean {
  if (level === "anyone") return true;
  if (level === "own") return ownerParticipantId === participantId;
  return false;
}

export function assertParticipantPermission(
  room: RoomRow,
  adminToken: string | undefined,
  permission: BooleanPermission
): void {
  if (isRoomAdmin(room, adminToken)) {
    return;
  }

  const allowed = {
    canViewIdeas: room.participantCanViewIdeas,
    canAddIdeas: room.participantCanAddIdeas,
    canHeartIdeas: room.participantCanHeartIdeas,
    canViewHeartCounts: room.participantCanViewHeartCounts,
    canExportData: room.participantCanExportData,
    canViewComments: room.participantCanViewComments,
    canAddComments: room.participantCanAddComments,
    canGenerateSummary: room.participantCanGenerateSummary,
    canRenameRoom: room.participantCanRenameRoom,
    canDeleteRoom: room.participantCanDeleteRoom
  }[permission];

  if (!allowed) {
    throw makeError("admin_required", "Admin access is required for this action.", 403);
  }
}

export async function renameRoom(roomSlug: string, title: string, adminToken?: string): Promise<Room> {
  const roomRow = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(roomRow, adminToken, "canRenameRoom");

  const [room] = await db
    .update(rooms)
    .set({ title, updatedAt: new Date() })
    .where(eq(rooms.id, roomRow.id))
    .returning();

  if (!room) {
    throw makeError("room_not_found", "Room does not exist.", 404);
  }
  return mapRoom(room);
}

function mapExportRow(row: ExportProjectionRow): RoomExportRow {
  return {
    ideaId: row.idea_id,
    ideaText: row.idea_text,
    heartCount: Number(row.heart_count),
    ideaCreatedAt: toIso(row.idea_created_at),
    ideaUpdatedAt: toIso(row.idea_updated_at),
    commentId: row.comment_id,
    commentText: row.comment_text,
    commentCreatedAt: row.comment_created_at ? toIso(row.comment_created_at) : null,
    commentUpdatedAt: row.comment_updated_at ? toIso(row.comment_updated_at) : null
  };
}

export async function getRoomExportData(
  roomSlug: string,
  participantId: string,
  includeComments: boolean,
  adminToken?: string
): Promise<RoomExportRow[]> {
  const roomRow = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(roomRow, adminToken, "canExportData");
  if (includeComments) {
    assertParticipantPermission(roomRow, adminToken, "canViewComments");
  }

  const rows = includeComments
    ? await db.execute<ExportProjectionRow>(sql`
        select
          i.id as idea_id,
          i.text as idea_text,
          count(distinct h.participant_id) as heart_count,
          i.created_at as idea_created_at,
          i.updated_at as idea_updated_at,
          c.id as comment_id,
          c.text as comment_text,
          c.created_at as comment_created_at,
          c.updated_at as comment_updated_at
        from ideas i
        left join idea_hearts h on h.idea_id = i.id
        left join comments c on c.idea_id = i.id
        where i.room_id = ${roomRow.id}
          and (${isRoomAdmin(roomRow, adminToken)} or ${roomRow.participantCanViewIdeas} or i.participant_id = ${participantId})
        group by i.id, c.id
        order by count(distinct h.participant_id) desc, i.created_at asc, c.created_at asc
      `)
    : await db.execute<ExportProjectionRow>(sql`
        select
          i.id as idea_id,
          i.text as idea_text,
          count(distinct h.participant_id) as heart_count,
          i.created_at as idea_created_at,
          i.updated_at as idea_updated_at,
          null::text as comment_id,
          null::text as comment_text,
          null::timestamptz as comment_created_at,
          null::timestamptz as comment_updated_at
        from ideas i
        left join idea_hearts h on h.idea_id = i.id
        where i.room_id = ${roomRow.id}
          and (${isRoomAdmin(roomRow, adminToken)} or ${roomRow.participantCanViewIdeas} or i.participant_id = ${participantId})
        group by i.id
        order by count(distinct h.participant_id) desc, i.created_at asc
      `);

  return rows.map(mapExportRow);
}

export async function deleteRoom(roomSlug: string, adminToken?: string): Promise<void> {
  const roomRow = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(roomRow, adminToken, "canDeleteRoom");

  const [room] = await db.delete(rooms).where(eq(rooms.id, roomRow.id)).returning({ slug: rooms.slug });

  if (!room) {
    throw makeError("room_not_found", "Room does not exist.", 404);
  }
}

export async function updateRoomPermissions(
  roomSlug: string,
  participantPermissions: ParticipantPermissions,
  adminToken?: string
): Promise<Room> {
  const roomRow = await getRoomRowBySlug(roomSlug);
  if (!isRoomAdmin(roomRow, adminToken)) {
    throw makeError("admin_required", "Admin access is required to update room permissions.", 403);
  }

  const [room] = await db
    .update(rooms)
    .set({
      participantCanViewIdeas: participantPermissions.canViewIdeas,
      participantCanAddIdeas: participantPermissions.canAddIdeas,
      participantCanHeartIdeas: participantPermissions.canHeartIdeas,
      participantCanViewHeartCounts: participantPermissions.canViewHeartCounts,
      participantIdeaManagement: participantPermissions.ideaManagement,
      participantCanExportData: participantPermissions.canExportData,
      participantCanViewComments: participantPermissions.canViewComments,
      participantCanAddComments: participantPermissions.canAddComments,
      participantCommentManagement: participantPermissions.commentManagement,
      participantCanGenerateSummary: participantPermissions.canGenerateSummary,
      participantCanRenameRoom: participantPermissions.canRenameRoom,
      participantCanDeleteRoom: participantPermissions.canDeleteRoom,
      updatedAt: new Date()
    })
    .where(eq(rooms.id, roomRow.id))
    .returning();

  if (!room) {
    throw makeError("room_not_found", "Room does not exist.", 404);
  }
  return mapRoom(room);
}

export async function touchRoom(roomId: string): Promise<void> {
  await db.update(rooms).set({ updatedAt: new Date() }).where(eq(rooms.id, roomId));
}

export async function getRoomSlugForIdea(ideaId: string): Promise<string> {
  const [row] = await db
    .select({ slug: rooms.slug })
    .from(ideas)
    .innerJoin(rooms, eq(rooms.id, ideas.roomId))
    .where(eq(ideas.id, ideaId))
    .limit(1);

  if (!row) {
    throw makeError("idea_not_found", "Idea does not exist.", 404);
  }
  return row.slug;
}

export async function ideaExistsInRoom(ideaId: string, roomId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: ideas.id })
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.roomId, roomId)))
    .limit(1);
  return Boolean(row);
}
