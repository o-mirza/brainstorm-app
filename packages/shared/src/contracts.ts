import type { Idea, IdeaDeleted, Room, RoomSnapshot, SharedIdea, SharedIdeaUpdate } from "./types.js";

export type CreateRoomResponse = {
  room: Room;
};

export type GetRoomResponse = RoomSnapshot;

export type RenameRoomRequest = {
  title: string;
};

export type RenameRoomResponse = {
  room: Room;
  clientMutationId?: string;
};

export type CreateIdeaRequest = {
  text: string;
  clientMutationId?: string;
};

export type CreateIdeaResponse = {
  idea: Idea;
  clientMutationId?: string;
};

export type UpdateIdeaRequest = {
  text: string;
  clientMutationId?: string;
};

export type UpdateIdeaResponse = {
  idea: Idea;
  clientMutationId?: string;
};

export type DeleteIdeaResponse = {
  ok: true;
  ideaId: string;
  clientMutationId?: string;
};

export type HeartIdeaResponse = {
  idea: Idea;
  clientMutationId?: string;
};

export type UnheartIdeaResponse = {
  idea: Idea;
  clientMutationId?: string;
};

export type ClientWsEvent =
  | {
      type: "room.subscribe";
      roomSlug: string;
      participantId: string;
    }
  | {
      type: "room.unsubscribe";
      roomSlug: string;
    }
  | {
      type: "ping";
    };

export type ServerWsEvent =
  | {
      type: "room.snapshot";
      snapshot: RoomSnapshot;
    }
  | {
      type: "room.updated";
      room: Room;
      clientMutationId?: string;
    }
  | {
      type: "idea.created";
      idea: SharedIdea;
      clientMutationId?: string;
    }
  | {
      type: "idea.updated";
      idea: SharedIdeaUpdate;
      clientMutationId?: string;
    }
  | {
      type: "idea.deleted";
      idea: IdeaDeleted;
      clientMutationId?: string;
    }
  | {
      type: "participant.count";
      roomSlug: string;
      count: number;
    }
  | {
      type: "pong";
    }
  | {
      type: "error";
      code: string;
      message: string;
    };
