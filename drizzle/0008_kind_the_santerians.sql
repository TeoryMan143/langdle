ALTER TABLE "lang_token" ALTER COLUMN "expires_at" SET DEFAULT '2025-09-18T00:46:27.871Z';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");