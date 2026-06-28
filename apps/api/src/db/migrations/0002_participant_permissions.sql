ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_add_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_edit_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_delete_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_heart_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_rename_room" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_delete_room" boolean NOT NULL DEFAULT false;

UPDATE "rooms"
SET
  "participant_can_rename_room" = "participant_management_enabled",
  "participant_can_delete_room" = "participant_management_enabled";
