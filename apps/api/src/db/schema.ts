import { boolean, index, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

type ManagementPermission = "none" | "own" | "anyone";

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    adminToken: text("admin_token").notNull(),
    participantManagementEnabled: boolean("participant_management_enabled").notNull().default(true),
    participantCanViewIdeas: boolean("participant_can_view_ideas").notNull().default(true),
    participantCanAddIdeas: boolean("participant_can_add_ideas").notNull().default(true),
    participantCanHeartIdeas: boolean("participant_can_heart_ideas").notNull().default(true),
    participantCanViewHeartCounts: boolean("participant_can_view_heart_counts").notNull().default(true),
    participantIdeaManagement: text("participant_idea_management").$type<ManagementPermission>().notNull().default("own"),
    participantCanExportData: boolean("participant_can_export_data").notNull().default(true),
    participantCanViewComments: boolean("participant_can_view_comments").notNull().default(true),
    participantCanAddComments: boolean("participant_can_add_comments").notNull().default(true),
    participantCommentManagement: text("participant_comment_management").$type<ManagementPermission>().notNull().default("own"),
    participantCanGenerateSummary: boolean("participant_can_generate_summary").notNull().default(true),
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
    participantId: text("participant_id"),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    roomIdIdx: index("ideas_room_id_idx").on(table.roomId),
    participantIdIdx: index("ideas_participant_id_idx").on(table.participantId),
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

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    ideaId: text("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    participantId: text("participant_id").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    ideaCreatedAtIdx: index("comments_idea_created_at_idx").on(table.ideaId, table.createdAt),
    roomIdIdx: index("comments_room_id_idx").on(table.roomId),
    participantIdIdx: index("comments_participant_id_idx").on(table.participantId)
  })
);
