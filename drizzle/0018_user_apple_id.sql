ALTER TABLE "user" ADD COLUMN "apple_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_apple_id_unique" UNIQUE("apple_id");