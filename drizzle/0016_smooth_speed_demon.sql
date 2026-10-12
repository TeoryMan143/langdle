CREATE TYPE "public"."change_request_state" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
ALTER TABLE "lang_token" ALTER COLUMN "expires_at" SET DEFAULT '2026-10-12T05:11:13.386Z';--> statement-breakpoint
ALTER TABLE "change_request" ADD COLUMN "state" "change_request_state" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "change_request" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "change_request" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "change_request" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "change_request" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "change_request" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "change_request" ADD CONSTRAINT "change_request_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;