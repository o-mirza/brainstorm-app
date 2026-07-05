ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "participant_id" text;
CREATE INDEX IF NOT EXISTS "ideas_participant_id_idx" ON "ideas" USING btree ("participant_id");

ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_view_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_view_heart_counts" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_manage_own_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_manage_any_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_view_comments" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_add_comments" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_manage_own_comments" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_manage_any_comments" boolean NOT NULL DEFAULT false;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_export_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_generate_summary" boolean NOT NULL DEFAULT false;

UPDATE "rooms"
SET
  "participant_can_manage_own_ideas" = "participant_can_edit_ideas" OR "participant_can_delete_ideas",
  "participant_can_manage_any_ideas" = "participant_can_edit_ideas" OR "participant_can_delete_ideas",
  "participant_can_view_comments" = "participant_can_comment",
  "participant_can_add_comments" = "participant_can_comment",
  "participant_can_manage_own_comments" = "participant_can_comment"
WHERE true;
