CREATE TABLE "lang_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"lang" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
