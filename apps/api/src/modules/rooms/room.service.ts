import type { Idea, Room, RoomSnapshot, SharedIdea } from "@brainstorm/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { ideas, rooms } from "../../db/schema.js";
import { createRoomId } from "../../shared/ids.js";
import { makeError, toIso } from "../../shared/http.js";
import { createRoomTitle } from "./room.name.js";
import { generateRoomSlug } from "./room.slug.js";

type RoomRow = typeof rooms.$inferSelect;

type IdeaProjectionRow = {
  id: string;
  room_id: string;
  text: string;
  heart_count: string | number;
  hearted_by_me: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function mapIdea(row: IdeaProjectionRow): Idea {
  return {
    id: row.id,
    roomId: row.room_id,
    text: row.text,
    heartCount: Number(row.heart_count),
    heartedByMe: row.hearted_by_me,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export function toSharedIdea(idea: Idea): SharedIdea {
  const { heartedByMe: _heartedByMe, ...shared } = idea;
  return shared;
}

export async function createRoom(): Promise<Room> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const [room] = await db
      .insert(rooms)
      .values({
        id: createRoomId(),
        slug: generateRoomSlug(),
        title: createRoomTitle(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoNothing({ target: rooms.slug })
      .returning();

    if (room) {
      return mapRoom(room);
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
      i.text,
      count(h.idea_id) as heart_count,
      exists(
        select 1 from idea_hearts mine
        where mine.idea_id = i.id and mine.participant_id = ${participantId}
      ) as hearted_by_me,
      i.created_at,
      i.updated_at
    from ideas i
    left join idea_hearts h on h.idea_id = i.id
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
  participantCount: number
): Promise<RoomSnapshot> {
  const roomRow = await getRoomRowBySlug(roomSlug);
  const ideaRows = await db.execute<IdeaProjectionRow>(sql`
    select
      i.id,
      i.room_id,
      i.text,
      count(h.idea_id) as heart_count,
      exists(
        select 1 from idea_hearts mine
        where mine.idea_id = i.id and mine.participant_id = ${participantId}
      ) as hearted_by_me,
      i.created_at,
      i.updated_at
    from ideas i
    left join idea_hearts h on h.idea_id = i.id
    where i.room_id = ${roomRow.id}
    group by i.id
    order by count(h.idea_id) desc, i.created_at asc
  `);

  return {
    room: mapRoom(roomRow),
    ideas: ideaRows.map(mapIdea),
    participantCount
  };
}

export async function renameRoom(roomSlug: string, title: string): Promise<Room> {
  const [room] = await db
    .update(rooms)
    .set({ title, updatedAt: new Date() })
    .where(eq(rooms.slug, roomSlug))
    .returning();

  if (!room) {
    throw makeError("room_not_found", "Room does not exist.", 404);
  }
  return mapRoom(room);
}

export async function deleteRoom(roomSlug: string): Promise<void> {
  const [room] = await db.delete(rooms).where(eq(rooms.slug, roomSlug)).returning({ slug: rooms.slug });

  if (!room) {
    throw makeError("room_not_found", "Room does not exist.", 404);
  }
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
