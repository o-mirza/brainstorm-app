import type { Idea } from "@brainstorm/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { ideaHearts, ideas } from "../../db/schema.js";
import { createIdeaId } from "../../shared/ids.js";
import { makeError } from "../../shared/http.js";
import {
  assertParticipantPermission,
  canManageParticipantItem,
  getIdeaProjection,
  getRoomRowBySlug,
  getRoomSlugForIdea,
  isRoomAdmin,
  redactIdeaForParticipant,
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
      participantId,
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
  return redactIdeaForParticipant(await getIdeaProjection(ideaId, participantId), room, adminToken);
}

export async function updateIdea(
  ideaId: string,
  participantId: string,
  text: string,
  adminToken?: string
): Promise<{ idea: Idea; roomSlug: string }> {
  const roomSlug = await getRoomSlugForIdea(ideaId);
  const room = await getRoomRowBySlug(roomSlug);
  const [existing] = await db.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!existing) {
    throw makeError("idea_not_found", "Idea does not exist.", 404);
  }
  if (!isRoomAdmin(room, adminToken)) {
    const canManage = canManageParticipantItem(room.participantIdeaManagement, existing.participantId, participantId);
    if (!canManage) {
      throw makeError("idea_update_forbidden", "You do not have permission to edit this idea.", 403);
    }
  }
  const [updated] = await db
    .update(ideas)
    .set({ text, updatedAt: new Date() })
    .where(eq(ideas.id, ideaId))
    .returning();

  if (!updated) {
    throw makeError("idea_not_found", "Idea does not exist.", 404);
  }
  await touchRoom(updated.roomId);
  return { idea: redactIdeaForParticipant(await getIdeaProjection(ideaId, participantId), room, adminToken), roomSlug };
}

export async function deleteIdea(
  ideaId: string,
  participantId: string,
  adminToken?: string
): Promise<{ ideaId: string; roomId: string; roomSlug: string }> {
  const roomSlug = await getRoomSlugForIdea(ideaId);
  const room = await getRoomRowBySlug(roomSlug);
  const [existing] = await db.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
  if (!existing) {
    throw makeError("idea_not_found", "Idea does not exist.", 404);
  }
  if (!isRoomAdmin(room, adminToken)) {
    const canManage = canManageParticipantItem(room.participantIdeaManagement, existing.participantId, participantId);
    if (!canManage) {
      throw makeError("idea_delete_forbidden", "You do not have permission to delete this idea.", 403);
    }
  }
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
  const idea = redactIdeaForParticipant(await getIdeaProjection(ideaId, participantId), room, adminToken);
  await touchRoom(idea.roomId);
  return { idea, roomSlug };
}

export async function unheartIdea(ideaId: string, participantId: string, adminToken?: string): Promise<{ idea: Idea; roomSlug: string }> {
  const roomSlug = await getRoomSlugForIdea(ideaId);
  const room = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(room, adminToken, "canHeartIdeas");
  await db.delete(ideaHearts).where(and(eq(ideaHearts.ideaId, ideaId), eq(ideaHearts.participantId, participantId)));
  const idea = redactIdeaForParticipant(await getIdeaProjection(ideaId, participantId), room, adminToken);
  await touchRoom(idea.roomId);
  return { idea, roomSlug };
}
