import type { Idea } from "@brainstorm/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { ideaHearts, ideas } from "../../db/schema.js";
import { createIdeaId } from "../../shared/ids.js";
import { makeError } from "../../shared/http.js";
import {
  assertParticipantPermission,
  getIdeaProjection,
  getRoomRowBySlug,
  getRoomSlugForIdea,
  touchRoom
} from "../rooms/room.service.js";

export async function createIdea(roomSlug: string, participantId: string, text: string, adminToken?: string): Promise<Idea> {
  const room = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(room, adminToken, "canAddIdeas");
  const ideaId = createIdeaId();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(ideas).values({
      id: ideaId,
      roomId: room.id,
      text,
      createdAt: now,
      updatedAt: now
    });
    await tx.insert(ideaHearts).values({
      ideaId,
      participantId,
      createdAt: now
    });
  });

  await touchRoom(room.id);
  return getIdeaProjection(ideaId, participantId);
}

export async function updateIdea(
  ideaId: string,
  participantId: string,
  text: string,
  adminToken?: string
): Promise<{ idea: Idea; roomSlug: string }> {
  const roomSlug = await getRoomSlugForIdea(ideaId);
  const room = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(room, adminToken, "canEditIdeas");
  const [updated] = await db
    .update(ideas)
    .set({ text, updatedAt: new Date() })
    .where(eq(ideas.id, ideaId))
    .returning();

  if (!updated) {
    throw makeError("idea_not_found", "Idea does not exist.", 404);
  }
  await touchRoom(updated.roomId);
  return { idea: await getIdeaProjection(ideaId, participantId), roomSlug };
}

export async function deleteIdea(ideaId: string, adminToken?: string): Promise<{ ideaId: string; roomId: string; roomSlug: string }> {
  const roomSlug = await getRoomSlugForIdea(ideaId);
  const room = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(room, adminToken, "canDeleteIdeas");
  const [deleted] = await db.delete(ideas).where(eq(ideas.id, ideaId)).returning();
  if (!deleted) {
    throw makeError("idea_not_found", "Idea does not exist.", 404);
  }
  await touchRoom(deleted.roomId);
  return { ideaId, roomId: deleted.roomId, roomSlug };
}

export async function heartIdea(ideaId: string, participantId: string, adminToken?: string): Promise<{ idea: Idea; roomSlug: string }> {
  const roomSlug = await getRoomSlugForIdea(ideaId);
  const room = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(room, adminToken, "canHeartIdeas");
  await db.insert(ideaHearts).values({ ideaId, participantId, createdAt: new Date() }).onConflictDoNothing();
  const idea = await getIdeaProjection(ideaId, participantId);
  await touchRoom(idea.roomId);
  return { idea, roomSlug };
}

export async function unheartIdea(ideaId: string, participantId: string, adminToken?: string): Promise<{ idea: Idea; roomSlug: string }> {
  const roomSlug = await getRoomSlugForIdea(ideaId);
  const room = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(room, adminToken, "canHeartIdeas");
  await db.delete(ideaHearts).where(and(eq(ideaHearts.ideaId, ideaId), eq(ideaHearts.participantId, participantId)));
  const idea = await getIdeaProjection(ideaId, participantId);
  await touchRoom(idea.roomId);
  return { idea, roomSlug };
}
