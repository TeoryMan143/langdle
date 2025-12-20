CREATE TABLE "game_story" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"target_lang" text NOT NULL,
	"guesses" integer NOT NULL,
	"guessed" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"native_language" text NOT NULL,
	"fluent" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lang_token" ALTER COLUMN "expires_at" SET DEFAULT '2025-09-22T22:05:43.904Z';--> statement-breakpoint
ALTER TABLE "game_story" ADD CONSTRAINT "game_story_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;