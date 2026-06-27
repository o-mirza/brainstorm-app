import { z } from "zod";
import { ideaTextSchema } from "../../shared/validation.js";

export const ideaTextRequestSchema = z.object({
  text: ideaTextSchema
});
