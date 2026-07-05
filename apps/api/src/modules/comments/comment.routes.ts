import type {
  CreateCommentRequest,
  CreateCommentResponse,
  DeleteCommentResponse,
  GetCommentsResponse,
  UpdateCommentRequest,
  UpdateCommentResponse
} from "@brainstorm/shared";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { makeError } from "../../shared/http.js";
import { commentIdSchema, ideaIdSchema, parseParticipantHeader } from "../../shared/validation.js";
import type { RealtimeGateway } from "../realtime/realtime.gateway.js";
import { createComment, deleteComment, getCommentsForIdea, updateComment } from "./comment.service.js";
import { commentTextRequestSchema } from "./comment.schemas.js";

function asBadRequest(error: unknown): Error {
  if (error instanceof ZodError) {
    return makeError("invalid_request", "Request did not match the expected shape.", 400);
  }
  return error as Error;
}

function parseClientMutationId(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= 120 ? value : undefined;
}

function parseAdminToken(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function withClientMutationId<T extends object>(value: T, clientMutationId: string | undefined): T & { clientMutationId?: string } {
  return clientMutationId ? { ...value, clientMutationId } : value;
}

export async function registerCommentRoutes(app: FastifyInstance, realtime: RealtimeGateway) {
  app.get<{ Params: { ideaId: string } }>("/api/ideas/:ideaId/comments", async (request): Promise<GetCommentsResponse> => {
    try {
      const ideaId = ideaIdSchema.parse(request.params.ideaId);
      const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
      const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
      return { comments: await getCommentsForIdea(ideaId, participantId, adminToken) };
    } catch (error) {
      throw asBadRequest(error);
    }
  });

  app.post<{ Params: { ideaId: string }; Body: CreateCommentRequest }>(
    "/api/ideas/:ideaId/comments",
    async (request): Promise<CreateCommentResponse> => {
      try {
        const ideaId = ideaIdSchema.parse(request.params.ideaId);
        const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
        const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
        const { text, clientMutationId } = commentTextRequestSchema.parse(request.body);
        const { comment, idea, roomSlug } = await createComment(ideaId, participantId, text, adminToken);
        realtime.broadcastRoom(
          roomSlug,
          withClientMutationId(
            {
              type: "comment.created",
              comment,
              idea: {
                id: idea.id,
                roomId: idea.roomId,
                commentCount: idea.commentCount,
                updatedAt: idea.updatedAt
              }
            },
            clientMutationId
          )
        );
        return withClientMutationId({ comment, idea }, clientMutationId);
      } catch (error) {
        throw asBadRequest(error);
      }
    }
  );

  app.delete<{ Params: { commentId: string } }>("/api/comments/:commentId", async (request): Promise<DeleteCommentResponse> => {
    try {
      const commentId = commentIdSchema.parse(request.params.commentId);
      const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
      const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
      const clientMutationId = parseClientMutationId(request.headers["x-client-mutation-id"]);
      const { comment, idea, roomSlug } = await deleteComment(commentId, participantId, adminToken);
      realtime.broadcastRoom(
        roomSlug,
        withClientMutationId(
          {
            type: "comment.deleted",
            comment: { id: comment.id, ideaId: comment.ideaId, roomId: comment.roomId },
            idea: {
              id: idea.id,
              roomId: idea.roomId,
              commentCount: idea.commentCount,
              updatedAt: idea.updatedAt
            }
          },
          clientMutationId
        )
      );
      return withClientMutationId({ ok: true, commentId: comment.id, idea }, clientMutationId);
    } catch (error) {
      throw asBadRequest(error);
    }
  });

  app.patch<{ Params: { commentId: string }; Body: UpdateCommentRequest }>(
    "/api/comments/:commentId",
    async (request): Promise<UpdateCommentResponse> => {
      try {
        const commentId = commentIdSchema.parse(request.params.commentId);
        const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
        const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
        const { text, clientMutationId } = commentTextRequestSchema.parse(request.body);
        const { comment, roomSlug } = await updateComment(commentId, participantId, text, adminToken);
        realtime.broadcastRoom(roomSlug, withClientMutationId({ type: "comment.updated", comment }, clientMutationId));
        return withClientMutationId({ comment }, clientMutationId);
      } catch (error) {
        throw asBadRequest(error);
      }
    }
  );
}
