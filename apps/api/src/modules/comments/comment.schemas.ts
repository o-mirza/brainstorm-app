import { z } from "zod";
import { commentTextSchema } from "../../shared/validation.js";

export const commentTextRequestSchema = z.object({
  text: commentTextSchema,
  clientMutationId: z.string().min(1).max(120).optional()
});
