import type { Idea, Room, RoomSnapshot, ServerWsEvent } from "@brainstorm/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../lib/api";
import { sortIdeas } from "../lib/sortIdeas";

type LoadState = "loading" | "ready" | "not-found" | "error";

export function useRoom(roomSlug: string, participantId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const applySnapshot = useCallback((snapshot: RoomSnapshot) => {
    setRoom(snapshot.room);
    setIdeas(sortIdeas(snapshot.ideas));
    setParticipantCount(snapshot.participantCount);
    setLoadState("ready");
    setError(null);
  }, []);

  const fetchSnapshot = useCallback(async () => {
    setLoadState((current) => (current === "ready" ? current : "loading"));
    try {
      applySnapshot(await api.getRoomSnapshot(roomSlug, participantId));
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Room could not be loaded.";
      setError(message);
      setLoadState(message.toLowerCase().includes("does not exist") ? "not-found" : "error");
    }
  }, [applySnapshot, participantId, roomSlug]);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  const applyServerEvent = useCallback(
    (event: ServerWsEvent) => {
      if (event.type === "room.snapshot") {
        applySnapshot(event.snapshot);
        return;
      }

      if (event.type === "room.updated") {
        setRoom(event.room);
        return;
      }

      if (event.type === "participant.count") {
        setParticipantCount(event.count);
        return;
      }

      if (event.type === "idea.created") {
        setIdeas((current) => {
          if (current.some((idea) => idea.id === event.idea.id)) return current;
          return sortIdeas([...current, { ...event.idea, heartedByMe: false }]);
        });
        return;
      }

      if (event.type === "idea.updated") {
        setIdeas((current) => {
          const exists = current.some((idea) => idea.id === event.idea.id);
          if (!exists) {
            void fetchSnapshot();
            return current;
          }
          return sortIdeas(current.map((idea) => (idea.id === event.idea.id ? { ...idea, ...event.idea } : idea)));
        });
        return;
      }

      if (event.type === "idea.deleted") {
        setIdeas((current) => current.filter((idea) => idea.id !== event.idea.id));
      }
    },
    [applySnapshot, fetchSnapshot]
  );

  const replaceIdea = useCallback((nextIdea: Idea) => {
    setIdeas((current) => sortIdeas([nextIdea, ...current.filter((idea) => idea.id !== nextIdea.id)]));
  }, []);

  const actions = useMemo(
    () => ({
      refresh: fetchSnapshot,
      renameRoom: async (title: string) => {
        const nextRoom = await api.renameRoom(roomSlug, title);
        setRoom(nextRoom);
        return nextRoom;
      },
      createIdea: async (text: string) => {
        const idea = await api.createIdea(roomSlug, participantId, text);
        replaceIdea(idea);
        return idea;
      },
      updateIdea: async (ideaId: string, text: string) => {
        const idea = await api.updateIdea(ideaId, participantId, text);
        replaceIdea(idea);
        return idea;
      },
      deleteIdea: async (ideaId: string) => {
        await api.deleteIdea(ideaId, participantId);
        setIdeas((current) => current.filter((idea) => idea.id !== ideaId));
      },
      toggleHeart: async (idea: Idea) => {
        const nextIdea = idea.heartedByMe
          ? await api.unheartIdea(idea.id, participantId)
          : await api.heartIdea(idea.id, participantId);
        replaceIdea(nextIdea);
        return nextIdea;
      }
    }),
    [fetchSnapshot, participantId, replaceIdea, roomSlug]
  );

  return {
    room,
    ideas,
    participantCount,
    loadState,
    error,
    actions,
    applySnapshot,
    applyServerEvent
  };
}
