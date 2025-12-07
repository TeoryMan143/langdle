ALTER TABLE "profile" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "profile" CASCADE;--> statement-breakpoint
ALTER TABLE "lang_token" ALTER COLUMN "expires_at" SET DEFAULT '2025-09-23T00:45:44.485Z';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "native_language" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "fluent" text;