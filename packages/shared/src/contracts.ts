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
};

export type CreateIdeaRequest = {
  text: string;
};

export type CreateIdeaResponse = {
  idea: Idea;
};

export type UpdateIdeaRequest = {
  text: string;
};

export type UpdateIdeaResponse = {
  idea: Idea;
};

export type DeleteIdeaResponse = {
  ok: true;
  ideaId: string;
};

export type HeartIdeaResponse = {
  idea: Idea;
};

export type UnheartIdeaResponse = {
  idea: Idea;
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
    }
  | {
      type: "idea.created";
      idea: SharedIdea;
    }
  | {
      type: "idea.updated";
      idea: SharedIdeaUpdate;
    }
  | {
      type: "idea.deleted";
      idea: IdeaDeleted;
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
