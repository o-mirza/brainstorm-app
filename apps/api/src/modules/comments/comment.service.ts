import type { Comment, Idea } from "@brainstorm/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { comments, ideas, rooms } from "../../db/schema.js";
import { makeError, toIso } from "../../shared/http.js";
import { createCommentId } from "../../shared/ids.js";
import {
  assertParticipantPermission,
  getIdeaProjection,
  getRoomRowBySlug,
  getRoomSlugForIdea,
  isRoomAdmin,
  touchRoom
} from "../rooms/room.service.js";

type CommentRow = typeof comments.$inferSelect;

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    ideaId: row.ideaId,
    roomId: row.roomId,
    participantId: row.participantId,
    text: row.text,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

async function getCommentWithRoom(commentId: string) {
  const [row] = await db
    .select({
      comment: comments,
      roomSlug: rooms.slug,
      room: rooms
    })
    .from(comments)
    .innerJoin(rooms, eq(rooms.id, comments.roomId))
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!row) {
    throw makeError("comment_not_found", "Comment does not exist.", 404);
  }

  return row;
}

export async function getCommentsForIdea(ideaId: string): Promise<Comment[]> {
  await getRoomSlugForIdea(ideaId);
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.ideaId, ideaId))
    .orderBy(comments.createdAt);

  return rows.map(mapComment);
}

export async function createComment(
  ideaId: string,
  participantId: string,
  text: string,
  adminToken?: string
): Promise<{ comment: Comment; idea: Idea; roomSlug: string }> {
  const roomSlug = await getRoomSlugForIdea(ideaId);
  const room = await getRoomRowBySlug(roomSlug);
  assertParticipantPermission(room, adminToken, "canComment");

  const [idea] = await db.select().from(ideas).where(and(eq(ideas.id, ideaId), eq(ideas.roomId, room.id))).limit(1);
  if (!idea) {
    throw makeError("idea_not_found", "Idea does not exist.", 404);
  }

  const now = new Date();
  const [created] = await db
    .insert(comments)
    .values({
      id: createCommentId(),
      ideaId,
      roomId: room.id,
      participantId,
      text,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  if (!created) {
    throw makeError("comment_create_failed", "Comment could not be created.", 500);
  }

  await touchRoom(room.id);
  return {
    comment: mapComment(created),
    idea: await getIdeaProjection(ideaId, participantId),
    roomSlug
  };
}

export async function deleteComment(
  commentId: string,
  participantId: string,
  adminToken?: string
): Promise<{ comment: Comment; idea: Idea; roomSlug: string }> {
  const row = await getCommentWithRoom(commentId);
  if (!isRoomAdmin(row.room, adminToken) && row.comment.participantId !== participantId) {
    throw makeError("comment_delete_forbidden", "Only the comment author or an admin can delete this comment.", 403);
  }

  const [deleted] = await db.delete(comments).where(eq(comments.id, commentId)).returning();
  if (!deleted) {
    throw makeError("comment_not_found", "Comment does not exist.", 404);
  }

  await touchRoom(deleted.roomId);
  return {
    comment: mapComment(deleted),
    idea: await getIdeaProjection(deleted.ideaId, participantId),
    roomSlug: row.roomSlug
  };
}

export async function updateComment(
  commentId: string,
  participantId: string,
  text: string,
  adminToken?: string
): Promise<{ comment: Comment; roomSlug: string }> {
  const row = await getCommentWithRoom(commentId);
  if (!isRoomAdmin(row.room, adminToken) && row.comment.participantId !== participantId) {
    throw makeError("comment_update_forbidden", "Only the comment author or an admin can edit this comment.", 403);
  }

  const [updated] = await db
    .update(comments)
    .set({ text, updatedAt: new Date() })
    .where(eq(comments.id, commentId))
    .returning();

  if (!updated) {
    throw makeError("comment_not_found", "Comment does not exist.", 404);
  }

  await touchRoom(updated.roomId);
  return {
    comment: mapComment(updated),
    roomSlug: row.roomSlug
  };
}
