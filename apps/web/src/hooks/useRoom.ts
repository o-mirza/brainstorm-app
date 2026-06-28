import type { Idea, ParticipantPermissions, Room, RoomSnapshot, ServerWsEvent } from "@brainstorm/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "../lib/api";
import { createClientMutationId } from "../lib/ids";
import { sortIdeas } from "../lib/sortIdeas";

type LoadState = "loading" | "ready" | "not-found" | "deleted" | "error";
export type ClientIdea = Idea & {
  renderKey: string;
  clientMutationId?: string;
};

function withRenderKey(idea: Idea, renderKey = idea.id): ClientIdea {
  return { ...idea, renderKey };
}

function makeOptimisticIdea(
  roomId: string,
  text: string,
  clientMutationId: string,
  createdAt = new Date().toISOString()
): ClientIdea {
  return {
    id: `optimistic_${crypto.randomUUID()}`,
    renderKey: `local_${clientMutationId}`,
    clientMutationId,
    roomId,
    text,
    heartCount: 1,
    heartedByMe: true,
    createdAt,
    updatedAt: createdAt
  };
}

export function useRoom(roomSlug: string, participantId: string, adminToken?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [ideas, setIdeas] = useState<ClientIdea[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const appliedMutationIdsRef = useRef(new Set<string>());
  const heartVersionsRef = useRef(new Map<string, number>());
  const canceledCreateMutationIdsRef = useRef(new Set<string>());
  const createHeartIntentsRef = useRef(new Map<string, boolean>());
  const deletedRef = useRef(false);
  const lastFetchIdRef = useRef(0);

  useEffect(() => {
    deletedRef.current = false;
    setRoom(null);
    setIdeas([]);
    setParticipantCount(0);
    setIsAdmin(false);
    setLoadState("loading");
    setError(null);
    lastFetchIdRef.current = 0;
  }, [roomSlug]);

  const applySnapshot = useCallback((snapshot: RoomSnapshot, preserveAdmin = false) => {
    deletedRef.current = false;
    setRoom(snapshot.room);
    setIdeas((current) => {
      const renderKeys = new Map(current.filter((idea) => !idea.id.startsWith("optimistic_")).map((idea) => [idea.id, idea.renderKey]));
      return sortIdeas(snapshot.ideas.map((idea) => withRenderKey(idea, renderKeys.get(idea.id))));
    });
    setParticipantCount(snapshot.participantCount);
    setIsAdmin((current) => (preserveAdmin ? current || snapshot.isAdmin : snapshot.isAdmin));
    setLoadState("ready");
    setError(null);
  }, []);

  const applyDeleted = useCallback(() => {
    deletedRef.current = true;
    setRoom(null);
    setIdeas([]);
    setParticipantCount(0);
    setIsAdmin(false);
    setLoadState("deleted");
    setError(null);
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (deletedRef.current) return;
    const fetchId = ++lastFetchIdRef.current;
    setLoadState((current) => (current === "ready" ? current : "loading"));
    try {
      const result = await api.getRoomSnapshot(roomSlug, participantId, adminToken);
      if (fetchId === lastFetchIdRef.current) {
        applySnapshot(result);
      }
    } catch (fetchError) {
      if (fetchId === lastFetchIdRef.current) {
        const message = fetchError instanceof Error ? fetchError.message : "Room could not be loaded.";
        setError(message);
        setLoadState(message.toLowerCase().includes("does not exist") ? "not-found" : "error");
      }
    }
  }, [adminToken, applySnapshot, participantId, roomSlug]);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  const applyServerEvent = useCallback(
    (event: ServerWsEvent) => {
      if (event.type === "room.snapshot") {
        applySnapshot(event.snapshot, true);
        return;
      }

      if (event.type === "room.updated") {
        setRoom(event.room);
        return;
      }

      if (event.type === "room.deleted") {
        if (event.roomSlug === roomSlug) {
          applyDeleted();
        }
        return;
      }

      if (event.type === "participant.count") {
        setParticipantCount(event.count);
        return;
      }

      if (event.type === "idea.created") {
        setIdeas((current) => {
          if (current.some((idea) => idea.id === event.idea.id)) return current;
          if (event.clientMutationId) {
            if (canceledCreateMutationIdsRef.current.has(event.clientMutationId)) {
              appliedMutationIdsRef.current.add(event.clientMutationId);
              const deleteMutationId = createClientMutationId();
              void api.deleteIdea(event.idea.id, participantId, deleteMutationId, adminToken).catch(() => {
                void fetchSnapshot();
              });
              return current;
            }
            const optimisticIdea = current.find((idea) => idea.clientMutationId === event.clientMutationId);
            if (optimisticIdea) {
              appliedMutationIdsRef.current.add(event.clientMutationId);
              const nextClientIdea = withRenderKey({ ...event.idea, heartedByMe: optimisticIdea.heartedByMe }, optimisticIdea.renderKey);
              nextClientIdea.clientMutationId = event.clientMutationId;
              return sortIdeas([
                nextClientIdea,
                ...current.filter((idea) => idea.renderKey !== optimisticIdea.renderKey)
              ]);
            }
            if (appliedMutationIdsRef.current.has(event.clientMutationId)) return current;
          }
          return sortIdeas([...current, withRenderKey({ ...event.idea, heartedByMe: false })]);
        });
        return;
      }

      if (event.type === "idea.updated") {
        if (event.clientMutationId && appliedMutationIdsRef.current.has(event.clientMutationId)) return;
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
        if (event.clientMutationId && appliedMutationIdsRef.current.has(event.clientMutationId)) return;
        setIdeas((current) => current.filter((idea) => idea.id !== event.idea.id));
      }
    },
    [applyDeleted, applySnapshot, fetchSnapshot, participantId, roomSlug]
  );

  const replaceIdea = useCallback((nextIdea: Idea, clientMutationId?: string) => {
    if (clientMutationId && appliedMutationIdsRef.current.has(clientMutationId)) return;
    if (clientMutationId) appliedMutationIdsRef.current.add(clientMutationId);
    setIdeas((current) => {
      const previousIdea = current.find((idea) => idea.id === nextIdea.id || (clientMutationId && idea.clientMutationId === clientMutationId));
      const nextClientIdea = withRenderKey(nextIdea, previousIdea?.renderKey);
      if (clientMutationId) {
        nextClientIdea.clientMutationId = clientMutationId;
      }
      return sortIdeas([nextClientIdea, ...current.filter((idea) => idea.renderKey !== nextClientIdea.renderKey && idea.id !== nextIdea.id)]);
    });
  }, []);

  const replaceOptimisticIdea = useCallback((optimisticId: string, nextIdea: Idea, clientMutationId: string) => {
    if (appliedMutationIdsRef.current.has(clientMutationId)) return;
    appliedMutationIdsRef.current.add(clientMutationId);
    setIdeas((current) => {
      const optimisticIdea = current.find((idea) => idea.id === optimisticId || idea.id === nextIdea.id || idea.clientMutationId === clientMutationId);
      const nextClientIdea = withRenderKey(nextIdea, optimisticIdea?.renderKey);
      nextClientIdea.clientMutationId = clientMutationId;
      return sortIdeas([nextClientIdea, ...current.filter((idea) => idea.renderKey !== nextClientIdea.renderKey && idea.id !== nextIdea.id)]);
    });
  }, []);

  const actions = useMemo(
    () => ({
      refresh: fetchSnapshot,
      renameRoom: async (title: string) => {
        const previousRoom = room;
        if (previousRoom) {
          setRoom({ ...previousRoom, title, updatedAt: new Date().toISOString() });
        }
        try {
          const nextRoom = await api.renameRoom(roomSlug, title, adminToken);
          setRoom(nextRoom);
          return nextRoom;
        } catch (renameError) {
          if (previousRoom) setRoom(previousRoom);
          throw renameError;
        }
      },
      deleteRoom: async () => {
        await api.deleteRoom(roomSlug, adminToken);
        applyDeleted();
      },
      updatePermissions: async (participantPermissions: ParticipantPermissions) => {
        const previousRoom = room;
        if (previousRoom) {
          setRoom({ ...previousRoom, participantPermissions, updatedAt: new Date().toISOString() });
        }
        try {
          const nextRoom = await api.updateRoomPermissions(roomSlug, participantPermissions, adminToken);
          setRoom(nextRoom);
          return nextRoom;
        } catch (permissionsError) {
          if (previousRoom) setRoom(previousRoom);
          throw permissionsError;
        }
      },
      createIdea: async (text: string) => {
        const clientMutationId = createClientMutationId();
        let optimisticCreatedAt = new Date().toISOString();
        if (ideas.length > 0) {
          const maxCreatedAt = ideas.reduce((max, idea) => (idea.createdAt > max ? idea.createdAt : max), "");
          if (maxCreatedAt && maxCreatedAt > optimisticCreatedAt) {
            const nextTime = new Date(maxCreatedAt).getTime() + 1;
            optimisticCreatedAt = new Date(nextTime).toISOString();
          }
        }
        const optimisticIdea = room ? makeOptimisticIdea(room.id, text, clientMutationId, optimisticCreatedAt) : null;
        if (optimisticIdea) {
          setIdeas((current) => sortIdeas([optimisticIdea, ...current]));
        }
        try {
          const idea = await api.createIdea(roomSlug, participantId, text, clientMutationId, adminToken);
          if (canceledCreateMutationIdsRef.current.has(clientMutationId)) {
            const deleteMutationId = createClientMutationId();
            appliedMutationIdsRef.current.add(clientMutationId);
            void api.deleteIdea(idea.id, participantId, deleteMutationId, adminToken).catch(() => {
              void fetchSnapshot();
            });
            return idea;
          }
          const desiredHeartedByMe = createHeartIntentsRef.current.get(clientMutationId);
          const ideaForDisplay =
            desiredHeartedByMe === false
              ? { ...idea, heartedByMe: false, heartCount: Math.max(0, idea.heartCount - 1) }
              : idea;
          if (optimisticIdea) {
            replaceOptimisticIdea(optimisticIdea.id, ideaForDisplay, clientMutationId);
          } else {
            replaceIdea(ideaForDisplay, clientMutationId);
          }
          if (desiredHeartedByMe === false) {
            const unheartMutationId = createClientMutationId();
            void api.unheartIdea(idea.id, participantId, unheartMutationId, adminToken)
              .then((nextIdea) => replaceIdea(nextIdea, unheartMutationId))
              .catch(() => {
                void fetchSnapshot();
              });
          }
          return idea;
        } catch (createError) {
          if (optimisticIdea) {
            setIdeas((current) => current.filter((idea) => idea.id !== optimisticIdea.id));
          }
          throw createError;
        }
      },
      updateIdea: async (ideaId: string, text: string) => {
        const clientMutationId = createClientMutationId();
        const previousIdea = ideas.find((idea) => idea.id === ideaId);
        if (previousIdea) {
          replaceIdea({ ...previousIdea, text, updatedAt: new Date().toISOString() });
        }
        try {
          const idea = await api.updateIdea(ideaId, participantId, text, clientMutationId, adminToken);
          replaceIdea(idea, clientMutationId);
          return idea;
        } catch (updateError) {
          if (previousIdea) replaceIdea(previousIdea);
          throw updateError;
        }
      },
      deleteIdea: async (ideaId: string) => {
        const optimisticIdea = ideas.find((idea) => idea.id === ideaId && idea.id.startsWith("optimistic_"));
        if (optimisticIdea) {
          if (optimisticIdea.clientMutationId) {
            canceledCreateMutationIdsRef.current.add(optimisticIdea.clientMutationId);
          }
          setIdeas((current) => current.filter((idea) => idea.id !== ideaId));
          return;
        }
        const clientMutationId = createClientMutationId();
        const previousIdeas = ideas;
        setIdeas((current) => current.filter((idea) => idea.id !== ideaId));
        try {
          await api.deleteIdea(ideaId, participantId, clientMutationId, adminToken);
          appliedMutationIdsRef.current.add(clientMutationId);
        } catch (deleteError) {
          setIdeas(previousIdeas);
          throw deleteError;
        }
      },
      toggleHeart: async (idea: Idea) => {
        const currentClientIdea = idea as ClientIdea;
        const clientMutationId = createClientMutationId();
        const optimisticIdea = {
          ...idea,
          heartedByMe: !idea.heartedByMe,
          heartCount: Math.max(0, idea.heartCount + (idea.heartedByMe ? -1 : 1)),
          updatedAt: new Date().toISOString()
        };
        if (currentClientIdea.id.startsWith("optimistic_")) {
          if (currentClientIdea.clientMutationId) {
            createHeartIntentsRef.current.set(currentClientIdea.clientMutationId, optimisticIdea.heartedByMe);
          }
          replaceIdea(optimisticIdea);
          return optimisticIdea;
        }
        const nextVersion = (heartVersionsRef.current.get(idea.id) ?? 0) + 1;
        heartVersionsRef.current.set(idea.id, nextVersion);
        replaceIdea(optimisticIdea);
        try {
          const nextIdea = idea.heartedByMe
            ? await api.unheartIdea(idea.id, participantId, clientMutationId, adminToken)
            : await api.heartIdea(idea.id, participantId, clientMutationId, adminToken);
          if (heartVersionsRef.current.get(idea.id) === nextVersion) {
            replaceIdea(nextIdea, clientMutationId);
          } else {
            appliedMutationIdsRef.current.add(clientMutationId);
          }
          return nextIdea;
        } catch (heartError) {
          if (heartVersionsRef.current.get(idea.id) === nextVersion) {
            replaceIdea(idea, clientMutationId);
          }
          throw heartError;
        }
      }
    }),
    [adminToken, applyDeleted, fetchSnapshot, ideas, participantId, replaceIdea, replaceOptimisticIdea, room, roomSlug]
  );

  return {
    room,
    ideas,
    participantCount,
    isAdmin,
    loadState,
    error,
    actions,
    applySnapshot,
    applyServerEvent
  };
}
