import { z } from "zod";
import { participantIdSchema, roomSlugSchema } from "../../shared/validation.js";

const adminTokenSchema = z.string().regex(/^[A-Za-z0-9]{32}$/);

export const clientWsEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("room.subscribe"),
    roomSlug: roomSlugSchema,
    participantId: participantIdSchema,
    adminToken: adminTokenSchema.optional()
  }),
  z.object({
    type: z.literal("room.unsubscribe"),
    roomSlug: roomSlugSchema
  }),
  z.object({
    type: z.literal("ping")
  })
]);
