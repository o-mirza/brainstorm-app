export type Room = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Idea = {
  id: string;
  roomId: string;
  text: string;
  heartCount: number;
  heartedByMe: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SharedIdea = Omit<Idea, "heartedByMe">;

export type SharedIdeaUpdate = {
  id: string;
  roomId: string;
  text?: string;
  heartCount?: number;
  updatedAt: string;
};

export type IdeaDeleted = {
  id: string;
  roomId: string;
};

export type RoomSnapshot = {
  room: Room;
  ideas: Idea[];
  participantCount: number;
};

export type RecentRoom = {
  roomSlug: string;
  title: string;
  ideaCount?: number;
  lastVisitedAt: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
