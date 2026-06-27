import { z } from "zod";
import { participantIdSchema, roomSlugSchema } from "../../shared/validation.js";

export const clientWsEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("room.subscribe"),
    roomSlug: roomSlugSchema,
    participantId: participantIdSchema
  }),
  z.object({
    type: z.literal("room.unsubscribe"),
    roomSlug: roomSlugSchema
  }),
  z.object({
    type: z.literal("ping")
  })
]);
