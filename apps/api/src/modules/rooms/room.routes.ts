import type {
  CreateRoomResponse,
  GetRoomResponse,
  RenameRoomRequest,
  RenameRoomResponse
} from "@brainstorm/shared";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { makeError } from "../../shared/http.js";
import { parseParticipantHeader, roomSlugSchema } from "../../shared/validation.js";
import type { RealtimeGateway } from "../realtime/realtime.gateway.js";
import { createRoom, getRoomSnapshot, renameRoom } from "./room.service.js";
import { renameRoomRequestSchema } from "./room.schemas.js";

function asBadRequest(error: unknown): Error {
  if (error instanceof ZodError) {
    return makeError("invalid_request", "Request did not match the expected shape.", 400);
  }
  return error as Error;
}

export async function registerRoomRoutes(app: FastifyInstance, realtime: RealtimeGateway) {
  app.post("/api/rooms", async (): Promise<CreateRoomResponse> => {
    return { room: await createRoom() };
  });

  app.get<{ Params: { roomSlug: string } }>("/api/rooms/:roomSlug", async (request): Promise<GetRoomResponse> => {
    try {
      const roomSlug = roomSlugSchema.parse(request.params.roomSlug);
      const participantId = parseParticipantHeader(request.headers["x-participant-id"]);
      return getRoomSnapshot(roomSlug, participantId, realtime.getParticipantCount(roomSlug));
    } catch (error) {
      throw asBadRequest(error);
    }
  });

  app.patch<{ Params: { roomSlug: string }; Body: RenameRoomRequest }>(
    "/api/rooms/:roomSlug",
    async (request): Promise<RenameRoomResponse> => {
      try {
        const roomSlug = roomSlugSchema.parse(request.params.roomSlug);
        const { title } = renameRoomRequestSchema.parse(request.body);
        const room = await renameRoom(roomSlug, title);
        realtime.broadcastRoom(roomSlug, { type: "room.updated", room });
        return { room };
      } catch (error) {
        throw asBadRequest(error);
      }
    }
  );
}
