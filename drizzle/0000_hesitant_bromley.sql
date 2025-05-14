CREATE TABLE "lang_permission" (
	"user_id" uuid NOT NULL,
	"lang" text NOT NULL,
	CONSTRAINT "lang_permission_user_id_lang_pk" PRIMARY KEY("user_id","lang")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nickname" text NOT NULL,
	"password" text NOT NULL,
	"admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
ALTER TABLE "lang_permission" ADD CONSTRAINT "lang_permission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;