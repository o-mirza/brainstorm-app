import {
  COMMENT_TEXT_MAX_LENGTH,
  COMMENT_TEXT_MIN_LENGTH,
  IDEA_TEXT_MAX_LENGTH,
  IDEA_TEXT_MIN_LENGTH,
  ROOM_TITLE_MAX_LENGTH,
  ROOM_TITLE_MIN_LENGTH
} from "@brainstorm/shared";
import { z } from "zod";

export const participantIdSchema = z.string().regex(/^p_[A-Za-z0-9_-]{8,30}$/);
export const roomSlugSchema = z.string().regex(/^[a-z0-9-]{5,80}$/);
export const ideaIdSchema = z.string().regex(/^i_[A-Za-z0-9_-]{8,30}$/);
export const commentIdSchema = z.string().regex(/^c_[A-Za-z0-9_-]{8,30}$/);

export const roomTitleSchema = z
  .string()
  .trim()
  .min(ROOM_TITLE_MIN_LENGTH)
  .max(ROOM_TITLE_MAX_LENGTH);

export const ideaTextSchema = z
  .string()
  .trim()
  .min(IDEA_TEXT_MIN_LENGTH)
  .max(IDEA_TEXT_MAX_LENGTH);

export const commentTextSchema = z
  .string()
  .trim()
  .min(COMMENT_TEXT_MIN_LENGTH)
  .max(COMMENT_TEXT_MAX_LENGTH);

export function parseParticipantHeader(header: unknown): string {
  if (Array.isArray(header)) {
    return participantIdSchema.parse(header[0]);
  }
  return participantIdSchema.parse(header);
}
