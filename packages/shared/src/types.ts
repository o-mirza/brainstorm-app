export type ParticipantPermissions = {
  canAddIdeas: boolean;
  canEditIdeas: boolean;
  canDeleteIdeas: boolean;
  canHeartIdeas: boolean;
  canComment: boolean;
  canRenameRoom: boolean;
  canDeleteRoom: boolean;
};

export function defaultParticipantPermissions(): ParticipantPermissions {
  return {
    canAddIdeas: true,
    canEditIdeas: true,
    canDeleteIdeas: true,
    canHeartIdeas: true,
    canComment: true,
    canRenameRoom: false,
    canDeleteRoom: false
  };
}

export type Room = {
  id: string;
  slug: string;
  title: string;
  participantPermissions: ParticipantPermissions;
  createdAt: string;
  updatedAt: string;
};

export type Idea = {
  id: string;
  roomId: string;
  text: string;
  heartCount: number;
  heartedByMe: boolean;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SharedIdea = Omit<Idea, "heartedByMe">;

export type SharedIdeaUpdate = {
  id: string;
  roomId: string;
  text?: string;
  heartCount?: number;
  commentCount?: number;
  updatedAt: string;
};

export type IdeaDeleted = {
  id: string;
  roomId: string;
};

export type Comment = {
  id: string;
  ideaId: string;
  roomId: string;
  participantId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type SharedComment = Comment;

export type CommentDeleted = {
  id: string;
  ideaId: string;
  roomId: string;
};

export type RoomSnapshot = {
  room: Room;
  ideas: Idea[];
  participantCount: number;
  isAdmin: boolean;
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
