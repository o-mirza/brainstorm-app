import type {
  CreateIdeaResponse,
  CreateRoomResponse,
  GetRoomResponse,
  HeartIdeaResponse,
  Idea,
  RenameRoomResponse,
  Room,
  RoomSnapshot,
  UnheartIdeaResponse,
  UpdateIdeaResponse
} from "@brainstorm/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body) {
    headers["content-type"] = "application/json";
  }
  Object.assign(headers, init.headers);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    let message = "Request failed.";
    try {
      const data = (await response.json()) as { error?: { message?: string } };
      message = data.error?.message ?? message;
    } catch {
      // Keep generic message.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function createRoom(): Promise<Room> {
  const data = await request<CreateRoomResponse>("/api/rooms", { method: "POST" });
  return data.room;
}

export async function getRoomSnapshot(roomSlug: string, participantId: string): Promise<RoomSnapshot> {
  return request<GetRoomResponse>(`/api/rooms/${roomSlug}`, {
    headers: { "x-participant-id": participantId }
  });
}

export async function renameRoom(roomSlug: string, title: string): Promise<Room> {
  const data = await request<RenameRoomResponse>(`/api/rooms/${roomSlug}`, {
    method: "PATCH",
    body: JSON.stringify({ title })
  });
  return data.room;
}

export async function createIdea(roomSlug: string, participantId: string, text: string, clientMutationId?: string): Promise<Idea> {
  const data = await request<CreateIdeaResponse>(`/api/rooms/${roomSlug}/ideas`, {
    method: "POST",
    headers: { "x-participant-id": participantId },
    body: JSON.stringify({ text, clientMutationId })
  });
  return data.idea;
}

export async function updateIdea(ideaId: string, participantId: string, text: string, clientMutationId?: string): Promise<Idea> {
  const data = await request<UpdateIdeaResponse>(`/api/ideas/${ideaId}`, {
    method: "PATCH",
    headers: { "x-participant-id": participantId },
    body: JSON.stringify({ text, clientMutationId })
  });
  return data.idea;
}

export async function deleteIdea(ideaId: string, participantId: string, clientMutationId?: string): Promise<void> {
  await request(`/api/ideas/${ideaId}`, {
    method: "DELETE",
    headers: {
      "x-participant-id": participantId,
      ...(clientMutationId ? { "x-client-mutation-id": clientMutationId } : {})
    }
  });
}

export async function heartIdea(ideaId: string, participantId: string, clientMutationId?: string): Promise<Idea> {
  const data = await request<HeartIdeaResponse>(`/api/ideas/${ideaId}/heart`, {
    method: "PUT",
    headers: {
      "x-participant-id": participantId,
      ...(clientMutationId ? { "x-client-mutation-id": clientMutationId } : {})
    }
  });
  return data.idea;
}

export async function unheartIdea(ideaId: string, participantId: string, clientMutationId?: string): Promise<Idea> {
  const data = await request<UnheartIdeaResponse>(`/api/ideas/${ideaId}/heart`, {
    method: "DELETE",
    headers: {
      "x-participant-id": participantId,
      ...(clientMutationId ? { "x-client-mutation-id": clientMutationId } : {})
    }
  });
  return data.idea;
}
