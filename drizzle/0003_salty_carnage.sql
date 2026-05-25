ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "author_email" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "is_anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "lgpd_accepted" boolean DEFAULT false NOT NULL;