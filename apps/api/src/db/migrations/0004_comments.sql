ALTER TABLE "rooms" ADD COLUMN "participant_can_comment" boolean DEFAULT true NOT NULL;

CREATE TABLE "comments" (
  "id" text PRIMARY KEY NOT NULL,
  "idea_id" text NOT NULL,
  "room_id" text NOT NULL,
  "participant_id" text NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "comments" ADD CONSTRAINT "comments_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "comments" ADD CONSTRAINT "comments_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "comments_idea_created_at_idx" ON "comments" USING btree ("idea_id","created_at");
CREATE INDEX "comments_room_id_idx" ON "comments" USING btree ("room_id");
CREATE INDEX "comments_participant_id_idx" ON "comments" USING btree ("participant_id");
