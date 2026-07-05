ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_manage_own_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_manage_any_ideas" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_manage_own_comments" boolean NOT NULL DEFAULT true;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_manage_any_comments" boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'participant_can_edit_own_ideas'
  ) THEN
    UPDATE "rooms"
    SET
      "participant_can_manage_own_ideas" = COALESCE("participant_can_edit_own_ideas", true) OR COALESCE("participant_can_delete_own_ideas", true),
      "participant_can_manage_any_ideas" = COALESCE("participant_can_edit_any_ideas", true) OR COALESCE("participant_can_delete_any_ideas", true);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'participant_can_edit_own_comments'
  ) THEN
    UPDATE "rooms"
    SET
      "participant_can_manage_own_comments" = COALESCE("participant_can_edit_own_comments", true) OR COALESCE("participant_can_delete_own_comments", true),
      "participant_can_manage_any_comments" = COALESCE("participant_can_edit_any_comments", false) OR COALESCE("participant_can_delete_any_comments", false);
  END IF;
END $$;

ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_edit_own_ideas";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_delete_own_ideas";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_edit_any_ideas";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_delete_any_ideas";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_view_my_heart_state";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_edit_own_comments";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_delete_own_comments";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_edit_any_comments";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_delete_any_comments";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_view_comment_counts";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "default_sort";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "show_sort_control";
