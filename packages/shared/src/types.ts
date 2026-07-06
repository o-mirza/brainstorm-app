export type ManagementPermission = "none" | "own" | "anyone";

export type ParticipantPermissions = {
  canViewIdeas: boolean;
  canAddIdeas: boolean;
  canHeartIdeas: boolean;
  canViewHeartCounts: boolean;
  ideaManagement: ManagementPermission;
  canExportData: boolean;
  canViewComments: boolean;
  canAddComments: boolean;
  commentManagement: ManagementPermission;
  canGenerateSummary: boolean;
  canRenameRoom: boolean;
  canDeleteRoom: boolean;
};

export function defaultParticipantPermissions(): ParticipantPermissions {
  return {
    canViewIdeas: true,
    canAddIdeas: true,
    canHeartIdeas: true,
    canViewHeartCounts: true,
    ideaManagement: "own",
    canExportData: true,
    canViewComments: true,
    canAddComments: true,
    commentManagement: "own",
    canGenerateSummary: true,
    canRenameRoom: false,
    canDeleteRoom: false
  };
}

export type SortOption = "popular" | "newest" | "oldest" | "my-hearts" | "alphabetical";

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
  participantId: string | null;
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

export type RoomExportRow = {
  ideaId: string;
  ideaText: string;
  heartCount: number;
  ideaCreatedAt: string;
  ideaUpdatedAt: string;
  commentId: string | null;
  commentText: string | null;
  commentCreatedAt: string | null;
  commentUpdatedAt: string | null;
};

export type RoomExportOptions = {
  includeHeartCounts: boolean;
  includeComments: boolean;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
