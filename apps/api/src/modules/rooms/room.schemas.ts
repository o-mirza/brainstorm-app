import { z } from "zod";
import { roomTitleSchema } from "../../shared/validation.js";

export const renameRoomRequestSchema = z.object({
  title: roomTitleSchema
});

export const updateRoomPermissionsRequestSchema = z.object({
  participantPermissions: z.object({
    canAddIdeas: z.boolean(),
    canEditIdeas: z.boolean(),
    canDeleteIdeas: z.boolean(),
    canHeartIdeas: z.boolean(),
    canRenameRoom: z.boolean(),
    canDeleteRoom: z.boolean()
  })
});
