import type { FastifyInstance } from "fastify";
import type { RealtimeGateway } from "./realtime.gateway.js";
import { clientWsEventSchema } from "./realtime.schemas.js";

export async function registerWebSocketRoutes(app: FastifyInstance, realtime: RealtimeGateway) {
  app.get("/ws", { websocket: true }, (socket) => {
    const connectionId = realtime.register(socket);

    socket.on("message", (rawMessage: Buffer | string) => {
      void (async () => {
        try {
          const message = typeof rawMessage === "string" ? rawMessage : rawMessage.toString();
          const event = clientWsEventSchema.parse(JSON.parse(message));
          await realtime.handleEvent(connectionId, event);
        } catch {
          realtime.send(connectionId, {
            type: "error",
            code: "invalid_message",
            message: "Invalid WebSocket message."
          });
        }
      })();
    });

    socket.on("close", () => realtime.disconnect(connectionId));
    socket.on("error", () => realtime.disconnect(connectionId));
  });
}
