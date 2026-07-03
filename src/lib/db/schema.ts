import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("event_status", ["draft", "active", "ended"]);
export const questionStatusEnum = pgEnum("question_status", ["pending", "next", "answered", "hidden"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "mediador", "owner", "superadmin"]);
export const userPlanEnum = pgEnum("user_plan", ["free", "paid"]);

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
  isPaid: boolean("is_paid").notNull().default(false),
  organizerId: text("organizer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
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
  // Clerk user id (e.g. "user_..."). Maps the Clerk identity back to this row in
  // the sync webhook. Null only during the migration window, before the row has
  // been reconciled with Clerk. See ADR-017.
  clerkId: text("clerk_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("mediador"),
  plan: userPlanEnum("plan").notNull().default("free"),
  // Nullable since ADR-017: users created via Clerk have no local hash — Clerk
  // owns the credential. Retained for the bcrypt migration and legacy rows.
  passwordHash: text("password_hash"),
  // Stripe subscription (`pro` plan). Per-event billing stays on events.is_paid;
  // these track the recurring subscription only. "É pro?" = subscriptionStatus
  // active/trialing. See ADR-018.
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const mediatorAssignments = pgTable("mediator_assignments", {
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("mediator_assignments_event_user_idx").on(t.eventId, t.userId),
]);

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  questionsCount: integer("questions_count").notNull().default(0),
  lgpdAccepted: boolean("lgpd_accepted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const registrations = pgTable("registrations", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
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
  eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
