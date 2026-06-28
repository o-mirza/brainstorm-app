import { boolean, index, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    adminToken: text("admin_token").notNull(),
    participantManagementEnabled: boolean("participant_management_enabled").notNull().default(true),
    participantCanAddIdeas: boolean("participant_can_add_ideas").notNull().default(true),
    participantCanEditIdeas: boolean("participant_can_edit_ideas").notNull().default(true),
    participantCanDeleteIdeas: boolean("participant_can_delete_ideas").notNull().default(true),
    participantCanHeartIdeas: boolean("participant_can_heart_ideas").notNull().default(true),
    participantCanRenameRoom: boolean("participant_can_rename_room").notNull().default(false),
    participantCanDeleteRoom: boolean("participant_can_delete_room").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugUnique: uniqueIndex("rooms_slug_unique_idx").on(table.slug)
  })
);

export const ideas = pgTable(
  "ideas",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    roomIdIdx: index("ideas_room_id_idx").on(table.roomId),
    roomCreatedAtIdx: index("ideas_room_created_at_idx").on(table.roomId, table.createdAt)
  })
);

export const ideaHearts = pgTable(
  "idea_hearts",
  {
    ideaId: text("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    participantId: text("participant_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ideaId, table.participantId] }),
    ideaIdIdx: index("idea_hearts_idea_id_idx").on(table.ideaId),
    participantIdIdx: index("idea_hearts_participant_id_idx").on(table.participantId)
  })
);
