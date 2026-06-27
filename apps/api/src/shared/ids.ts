import { customAlphabet, nanoid } from "nanoid";
import { IDEA_ID_PREFIX, PARTICIPANT_ID_PREFIX, ROOM_ID_PREFIX } from "@brainstorm/shared";

const roomSlugAlphabet = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export function createRoomId(): string {
  return `${ROOM_ID_PREFIX}${nanoid(12)}`;
}

export function createIdeaId(): string {
  return `${IDEA_ID_PREFIX}${nanoid(12)}`;
}

export function createRoomSlug(): string {
  return roomSlugAlphabet();
}

export function isParticipantId(value: string): boolean {
  return value.startsWith(PARTICIPANT_ID_PREFIX) && value.length <= 32;
}
