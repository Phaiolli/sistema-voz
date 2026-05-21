CREATE TABLE IF NOT EXISTS "registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"document" text,
	"checked_in" boolean DEFAULT false NOT NULL,
	"checked_in_at" timestamp with time zone,
	"kit_delivered" boolean DEFAULT false NOT NULL,
	"kit_delivered_at" timestamp with time zone,
	"drawn" boolean DEFAULT false NOT NULL,
	"drawn_at" timestamp with time zone,
	"lgpd_accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "registrations_event_email_idx" ON "registrations" USING btree ("event_id","email");
CREATE INDEX IF NOT EXISTS "registrations_event_id_idx" ON "registrations" USING btree ("event_id");
