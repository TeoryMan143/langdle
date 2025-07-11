ALTER TABLE "lang_token" ALTER COLUMN "expires_at" SET DEFAULT '2025-07-11T23:38:59.033Z';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "googleId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "country" text NOT NULL;