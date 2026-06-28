ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "admin_token" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_management_enabled" boolean DEFAULT true NOT NULL;

UPDATE "rooms"
SET "admin_token" = 'legacy_' || md5("id" || random()::text || clock_timestamp()::text)
WHERE "admin_token" IS NULL;

ALTER TABLE "rooms" ALTER COLUMN "admin_token" SET NOT NULL;
