import type {
  CreateRoomResponse,
  DeleteRoomResponse,
  ExportRoomDataResponse,
  GenerateSummaryResponse,
  GetRoomResponse,
  RenameRoomRequest,
  RenameRoomResponse,
  UpdateRoomPermissionsRequest,
  UpdateRoomPermissionsResponse
} from "@brainstorm/shared";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { makeError } from "../../shared/http.js";
import { parseParticipantHeader, roomSlugSchema } from "../../shared/validation.js";
import type { RealtimeGateway } from "../realtime/realtime.gateway.js";
import { generateAISummary } from "./ai-summary.service.js";
import {
  assertParticipantPermission,
  createRoom,
  deleteRoom,
  getRoomExportData,
  getRoomRowBySlug,
  getRoomSnapshot,
  renameRoom,
  updateRoomPermissions
} from "./room.service.js";
import { renameRoomRequestSchema, updateRoomPermissionsRequestSchema } from "./room.schemas.js";

function asBadRequest(error: unknown): Error {
  if (error instanceof ZodError) {
    return makeError("invalid_request", "Request did not match the expected shape.", 400);
  }
  return error as Error;
}

function parseAdminToken(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function registerRoomRoutes(app: FastifyInstance, realtime: RealtimeGateway) {
  app.post("/api/rooms", async (): Promise<CreateRoomResponse> => {
    return createRoom();
  });

  app.get<{ Params: { roomSlug: string } }>("/api/rooms/:roomSlug", async (request): Promise<GetRoomResponse> => {
    try {
      const roomSlug = roomSlugSchema.parse(request.params.roomSlug);
      const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
      const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
      return getRoomSnapshot(roomSlug, participantId, realtime.getParticipantCount(roomSlug), adminToken);
    } catch (error) {
      throw asBadRequest(error);
    }
  });

  app.get<{ Params: { roomSlug: string }; Querystring: { includeHeartCounts?: string; includeComments?: string } }>(
    "/api/rooms/:roomSlug/export",
    async (request): Promise<ExportRoomDataResponse> => {
      try {
        const roomSlug = roomSlugSchema.parse(request.params.roomSlug);
        const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
        const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
        const includeHeartCounts = request.query.includeHeartCounts === "true";
        const includeComments = request.query.includeComments === "true";
        const rows = await getRoomExportData(roomSlug, participantId, { includeHeartCounts, includeComments }, adminToken);
        return { rows };
      } catch (error) {
        throw asBadRequest(error);
      }
    }
  );

  app.patch<{ Params: { roomSlug: string }; Body: RenameRoomRequest }>(
    "/api/rooms/:roomSlug",
    async (request): Promise<RenameRoomResponse> => {
      try {
        const roomSlug = roomSlugSchema.parse(request.params.roomSlug);
        const { title } = renameRoomRequestSchema.parse(request.body);
        const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
        const room = await renameRoom(roomSlug, title, adminToken);
        realtime.broadcastRoom(roomSlug, { type: "room.updated", room });
        return { room };
      } catch (error) {
        throw asBadRequest(error);
      }
    }
  );

  app.delete<{ Params: { roomSlug: string } }>("/api/rooms/:roomSlug", async (request): Promise<DeleteRoomResponse> => {
    try {
      const roomSlug = roomSlugSchema.parse(request.params.roomSlug);
      const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
      await deleteRoom(roomSlug, adminToken);
      realtime.broadcastRoomDeleted(roomSlug);
      return { ok: true, roomSlug };
    } catch (error) {
      throw asBadRequest(error);
    }
  });

  app.post<{ Params: { roomSlug: string } }>("/api/rooms/:roomSlug/ai-summary", async (request): Promise<GenerateSummaryResponse> => {
      try {
        const roomSlug = roomSlugSchema.parse(request.params.roomSlug);
        parseParticipantHeader(request.headers["x-participant-id"]);
        const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
        assertParticipantPermission(await getRoomRowBySlug(roomSlug), adminToken, "canGenerateSummary");
        const summary = await generateAISummary(roomSlug);
        return { summary };
    } catch (error) {
      throw asBadRequest(error);
    }
  });

  app.patch<{ Params: { roomSlug: string }; Body: UpdateRoomPermissionsRequest }>(
    "/api/rooms/:roomSlug/permissions",
    async (request): Promise<UpdateRoomPermissionsResponse> => {
      try {
        const roomSlug = roomSlugSchema.parse(request.params.roomSlug);
        const { participantPermissions } = updateRoomPermissionsRequestSchema.parse(request.body);
        const adminToken = parseAdminToken(request.headers["x-room-admin-token"]);
        const room = await updateRoomPermissions(roomSlug, participantPermissions, adminToken);
        await realtime.broadcastRoomSnapshots(roomSlug);
        return { room };
      } catch (error) {
        throw asBadRequest(error);
      }
    }
  );
}
