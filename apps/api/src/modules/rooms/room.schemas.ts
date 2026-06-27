import { z } from "zod";
import { roomTitleSchema } from "../../shared/validation.js";

export const renameRoomRequestSchema = z.object({
  title: roomTitleSchema
});
