import { useMemo } from "react";
import { createParticipantId } from "../lib/ids";

const PARTICIPANT_KEY = "brainstorm.participantId";

export function useParticipantId(): string {
  return useMemo(() => {
    const existing = localStorage.getItem(PARTICIPANT_KEY);
    if (existing) return existing;
    const next = createParticipantId();
    localStorage.setItem(PARTICIPANT_KEY, next);
    return next;
  }, []);
}
