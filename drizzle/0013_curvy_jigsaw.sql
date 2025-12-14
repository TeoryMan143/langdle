ALTER TABLE "game_story" RENAME TO "game_history";--> statement-breakpoint
ALTER TABLE "game_history" DROP CONSTRAINT "game_story_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "lang_token" ALTER COLUMN "expires_at" SET DEFAULT '2025-12-14T16:17:50.090Z';--> statement-breakpoint
ALTER TABLE "game_history" ADD CONSTRAINT "game_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;