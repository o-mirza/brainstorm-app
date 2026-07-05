import { z } from "zod";
import { roomTitleSchema } from "../../shared/validation.js";

const managementPermissionSchema = z.enum(["none", "own", "anyone"]);

export const renameRoomRequestSchema = z.object({
  title: roomTitleSchema
});

export const updateRoomPermissionsRequestSchema = z.object({
  participantPermissions: z.object({
    canViewIdeas: z.boolean(),
    canAddIdeas: z.boolean(),
    canHeartIdeas: z.boolean(),
    canViewHeartCounts: z.boolean(),
    ideaManagement: managementPermissionSchema,
    canExportData: z.boolean(),
    canViewComments: z.boolean(),
    canAddComments: z.boolean(),
    commentManagement: managementPermissionSchema,
    canGenerateSummary: z.boolean(),
    canRenameRoom: z.boolean(),
    canDeleteRoom: z.boolean()
  })
});
