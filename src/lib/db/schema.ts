import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("event_status", ["draft", "active", "ended"]);
export const questionStatusEnum = pgEnum("question_status", ["pending", "next", "answered", "hidden"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "mediador", "owner", "superadmin"]);

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
  authorEmail: text("author_email"),
  authorIp: text("author_ip"), // PII — used for rate limiting only; never returned by public API
  text: text("text").notNull(),
  status: questionStatusEnum("status").notNull().default("pending"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  lgpdAccepted: boolean("lgpd_accepted").notNull().default(false),
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
  plan: text("plan").notNull().default("free"),
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
  authorIp: text("author_ip"), // PII — used for rate limiting only; never returned by public API
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

export const eventPayments = pgTable("event_payments", {
  id: text("id").primaryKey(),
  eventId: text("event_id").references(() => events.id),
  ownerId: text("owner_id").notNull().references(() => users.id),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("brl"),
  status: text("status").notNull().default("pending"),
  eventData: jsonb("event_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (t) => [
  index("event_payments_owner_id_idx").on(t.ownerId),
]);
