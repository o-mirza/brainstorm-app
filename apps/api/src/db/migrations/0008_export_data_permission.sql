DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'participant_can_export_ideas'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'participant_can_export_data'
  ) THEN
    ALTER TABLE "rooms" RENAME COLUMN "participant_can_export_ideas" TO "participant_can_export_data";
  END IF;
END $$;

ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "participant_can_export_data" boolean NOT NULL DEFAULT true;
