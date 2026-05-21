import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("event_status", ["draft", "active", "ended"]);
export const questionStatusEnum = pgEnum("question_status", ["pending", "next", "answered", "hidden"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "mediador"]);

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  place: text("place").notNull(),
  address: text("address").notNull(),
  status: eventStatusEnum("status").notNull().default("draft"),
  about: text("about").notNull().default(""),
  theme: jsonb("theme").notNull().default({}),
  config: jsonb("config").notNull().default({}),
  organizerId: text("organizer_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id),
  authorName: text("author_name").notNull(),
  authorContact: text("author_contact"),
  authorIp: text("author_ip"),
  text: text("text").notNull(),
  status: questionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  presentedAt: timestamp("presented_at", { withTimezone: true }),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  hiddenBy: text("hidden_by"),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("mediador"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const mediatorAssignments = pgTable("mediator_assignments", {
  eventId: text("event_id").notNull().references(() => events.id),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("mediator_assignments_event_user_idx").on(t.eventId, t.userId),
]);

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  questionsCount: integer("questions_count").notNull().default(0),
  lgpdAccepted: boolean("lgpd_accepted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const registrations = pgTable("registrations", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  document: text("document"),
  checkedIn: boolean("checked_in").notNull().default(false),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  kitDelivered: boolean("kit_delivered").notNull().default(false),
  kitDeliveredAt: timestamp("kit_delivered_at", { withTimezone: true }),
  drawn: boolean("drawn").notNull().default(false),
  drawnAt: timestamp("drawn_at", { withTimezone: true }),
  lgpdAccepted: boolean("lgpd_accepted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("registrations_event_email_idx").on(t.eventId, t.email),
  index("registrations_event_id_idx").on(t.eventId),
]);
