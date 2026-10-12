CREATE TABLE "change_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lang" text NOT NULL,
	"feature" "features" NOT NULL,
	"status" "feature_status" NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lang_token" ALTER COLUMN "expires_at" SET DEFAULT '2026-08-23T15:28:42.450Z';--> statement-breakpoint
ALTER TABLE "change_request" ADD CONSTRAINT "change_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;