CREATE TABLE "language_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"exonym" text,
	"features" "features"[] DEFAULT '{}' NOT NULL,
	"partial" "features"[] DEFAULT '{}' NOT NULL,
	"description" text NOT NULL,
	"flag_key" text NOT NULL,
	"state" "change_request_state" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid
);
--> statement-breakpoint
ALTER TABLE "language_request" ADD CONSTRAINT "language_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "language_request" ADD CONSTRAINT "language_request_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "language_request_pending_code" ON "language_request" USING btree ("code") WHERE "language_request"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "language_request_user" ON "language_request" USING btree ("user_id");