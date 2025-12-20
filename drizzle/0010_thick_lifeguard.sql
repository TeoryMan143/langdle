ALTER TABLE "lang_token" ALTER COLUMN "expires_at" SET DEFAULT '2025-09-22T22:43:10.173Z';--> statement-breakpoint
ALTER TABLE "profile" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "native_language" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "fluent" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN "id";