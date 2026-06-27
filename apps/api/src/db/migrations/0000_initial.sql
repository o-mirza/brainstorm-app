CREATE TABLE IF NOT EXISTS "rooms" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "rooms_slug_unique_idx" ON "rooms" ("slug");

CREATE TABLE IF NOT EXISTS "ideas" (
  "id" text PRIMARY KEY NOT NULL,
  "room_id" text NOT NULL REFERENCES "rooms"("id") ON DELETE cascade,
  "text" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ideas_room_id_idx" ON "ideas" ("room_id");
CREATE INDEX IF NOT EXISTS "ideas_room_created_at_idx" ON "ideas" ("room_id", "created_at");

CREATE TABLE IF NOT EXISTS "idea_hearts" (
  "idea_id" text NOT NULL REFERENCES "ideas"("id") ON DELETE cascade,
  "participant_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("idea_id", "participant_id")
);
CREATE INDEX IF NOT EXISTS "idea_hearts_idea_id_idx" ON "idea_hearts" ("idea_id");
CREATE INDEX IF NOT EXISTS "idea_hearts_participant_id_idx" ON "idea_hearts" ("participant_id");
