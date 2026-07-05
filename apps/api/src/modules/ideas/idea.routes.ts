import type {
  CreateIdeaRequest,
  CreateIdeaResponse,
  DeleteIdeaResponse,
  HeartIdeaResponse,
  UnheartIdeaResponse,
  UpdateIdeaRequest,
  UpdateIdeaResponse
} from "@brainstorm/shared";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { makeError } from "../../shared/http.js";
import { ideaIdSchema, parseParticipantHeader, roomSlugSchema } from "../../shared/validation.js";
import type { RealtimeGateway } from "../realtime/realtime.gateway.js";
import { toSharedIdea } from "../rooms/room.service.js";
import { createIdea, deleteIdea, heartIdea, unheartIdea, updateIdea } from "./idea.service.js";
import { ideaTextRequestSchema } from "./idea.schemas.js";

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

export async function registerIdeaRoutes(app: FastifyInstance, realtime: RealtimeGateway) {
  app.post<{ Params: { roomSlug: string }; Body: CreateIdeaRequest }>(
    "/api/rooms/:roomSlug/ideas",
    async (request): Promise<CreateIdeaResponse> => {
      try {
        const roomSlug = roomSlugSchema.parse(request.params.roomSlug);
        const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
        const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
        const { text, clientMutationId } = ideaTextRequestSchema.parse(request.body);
        const idea = await createIdea(roomSlug, participantId, text, adminToken);
        realtime.broadcastRoom(roomSlug, withClientMutationId({ type: "idea.created", idea: toSharedIdea(idea) }, clientMutationId));
        return withClientMutationId({ idea }, clientMutationId);
      } catch (error) {
        throw asBadRequest(error);
      }
    }
  );

  app.patch<{ Params: { ideaId: string }; Body: UpdateIdeaRequest }>(
    "/api/ideas/:ideaId",
    async (request): Promise<UpdateIdeaResponse> => {
      try {
        const ideaId = ideaIdSchema.parse(request.params.ideaId);
        const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
        const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
        const { text, clientMutationId } = ideaTextRequestSchema.parse(request.body);
        const { idea, roomSlug } = await updateIdea(ideaId, participantId, text, adminToken);
        realtime.broadcastRoom(
          roomSlug,
          withClientMutationId(
            {
              type: "idea.updated",
              idea: {
                id: idea.id,
                roomId: idea.roomId,
                text: idea.text,
                heartCount: idea.heartCount,
                updatedAt: idea.updatedAt
              }
            },
            clientMutationId
          )
        );
        return withClientMutationId({ idea }, clientMutationId);
      } catch (error) {
        throw asBadRequest(error);
      }
    }
  );

  app.delete<{ Params: { ideaId: string } }>("/api/ideas/:ideaId", async (request): Promise<DeleteIdeaResponse> => {
    try {
      const ideaId = ideaIdSchema.parse(request.params.ideaId);
      const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
      const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
      const clientMutationId = parseClientMutationId(request.headers["x-client-mutation-id"]);
      const deleted = await deleteIdea(ideaId, participantId, adminToken);
      realtime.broadcastRoom(
        deleted.roomSlug,
        withClientMutationId({ type: "idea.deleted", idea: { id: deleted.ideaId, roomId: deleted.roomId } }, clientMutationId)
      );
      return withClientMutationId({ ok: true, ideaId: deleted.ideaId }, clientMutationId);
    } catch (error) {
      throw asBadRequest(error);
    }
  });

  app.put<{ Params: { ideaId: string } }>("/api/ideas/:ideaId/heart", async (request): Promise<HeartIdeaResponse> => {
    try {
      const ideaId = ideaIdSchema.parse(request.params.ideaId);
      const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
      const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
      const clientMutationId = parseClientMutationId(request.headers["x-client-mutation-id"]);
      const { idea, roomSlug } = await heartIdea(ideaId, participantId, adminToken);
      realtime.broadcastRoom(
        roomSlug,
        withClientMutationId(
          { type: "idea.updated", idea: { id: idea.id, roomId: idea.roomId, heartCount: idea.heartCount, updatedAt: idea.updatedAt } },
          clientMutationId
        )
      );
      return withClientMutationId({ idea }, clientMutationId);
    } catch (error) {
      throw asBadRequest(error);
    }
  });

  app.delete<{ Params: { ideaId: string } }>(
    "/api/ideas/:ideaId/heart",
    async (request): Promise<UnheartIdeaResponse> => {
      try {
        const ideaId = ideaIdSchema.parse(request.params.ideaId);
        const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
        const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
        const clientMutationId = parseClientMutationId(request.headers["x-client-mutation-id"]);
        const { idea, roomSlug } = await unheartIdea(ideaId, participantId, adminToken);
        realtime.broadcastRoom(
          roomSlug,
          withClientMutationId(
            { type: "idea.updated", idea: { id: idea.id, roomId: idea.roomId, heartCount: idea.heartCount, updatedAt: idea.updatedAt } },
            clientMutationId
          )
        );
        return withClientMutationId({ idea }, clientMutationId);
      } catch (error) {
        throw asBadRequest(error);
      }
    }
  );
}
