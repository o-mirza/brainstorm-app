import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { env } from "./env.js";
import { db } from "./db/client.js";
import { registerCommentRoutes } from "./modules/comments/comment.routes.js";
import { registerIdeaRoutes } from "./modules/ideas/idea.routes.js";
import { registerRoomRoutes } from "./modules/rooms/room.routes.js";
import { RealtimeGateway } from "./modules/realtime/realtime.gateway.js";
import { registerWebSocketRoutes } from "./modules/realtime/websocket.routes.js";

export async function buildServer() {
  const app = Fastify({ logger: env.NODE_ENV !== "test" });
  const realtime = new RealtimeGateway(db);

  await app.register(cors, {
    origin: env.CLIENT_ORIGIN,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-participant-id", "x-client-mutation-id", "x-room-admin-token"]
  });
  await app.register(sensible);
  await app.register(websocket);

  app.get("/health", async () => ({ ok: true }));

  await registerRoomRoutes(app, realtime);
  await registerIdeaRoutes(app, realtime);
  await registerCommentRoutes(app, realtime);
  await registerWebSocketRoutes(app, realtime);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const handledError = error as Error & { code?: unknown; statusCode?: unknown };
    const statusCode = typeof handledError.statusCode === "number" ? handledError.statusCode : undefined;
    const code = typeof handledError.code === "string" ? handledError.code : "request_error";
    if (statusCode) {
      return reply.status(statusCode).send({
        error: {
          code,
          message: handledError.message
        }
      });
    }
    return reply.status(500).send({
      error: {
        code: "internal_error",
        message: "Something went wrong."
      }
    });
  });

  app.addHook("onClose", async () => {
    await realtime.close();
  });

  return app;
}
