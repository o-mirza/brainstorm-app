ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_idea_management" text NOT NULL DEFAULT 'anyone';
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_comment_management" text NOT NULL DEFAULT 'own';

UPDATE "rooms"
SET
  "participant_idea_management" = CASE
    WHEN "participant_can_manage_any_ideas" THEN 'anyone'
    WHEN "participant_can_manage_own_ideas" THEN 'own'
    ELSE 'none'
  END,
  "participant_comment_management" = CASE
    WHEN "participant_can_manage_any_comments" THEN 'anyone'
    WHEN "participant_can_manage_own_comments" THEN 'own'
    ELSE 'none'
  END;

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_participant_idea_management_check"
  CHECK ("participant_idea_management" IN ('none', 'own', 'anyone'));
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_participant_comment_management_check"
  CHECK ("participant_comment_management" IN ('none', 'own', 'anyone'));

ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_manage_own_ideas";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_manage_any_ideas";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_manage_own_comments";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "participant_can_manage_any_comments";
