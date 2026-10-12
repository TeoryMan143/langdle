CREATE TYPE "public"."features" AS ENUM('nasalization', 'clickConsonants', 'tones', 'pitchAccent', 'vowelHarmony', 'ejectiveConsonants', 'implosiveConsonants', 'retroflexConsonants', 'consonantClusters', 'openSyllablesOnly', 'highVowelInventory', 'lowVowelInventory', 'highConsonantInventory', 'lowConsonantInventory', 'gemination', 'palatalization', 'lateralFricatives', 'creakyVoice', 'pharyngealization', 'aspiratedConsonants', 'labialization', 'svo', 'sov', 'vso', 'vos', 'ovs', 'osv', 'v2', 'freeWordOrder', 'fixedWordOrder', 'latinAlphabet', 'cyrillicAlphabet', 'alphabet', 'abjad', 'abugida', 'logographic', 'syllabary', 'ergativeAlignment', 'nominativeAccusativeAlignment', 'tripartiteAlignment', 'nounClasses', 'dualNumber', 'trialNumber', 'inclusiveExclusiveWe', 'evidentiality', 'switchReference', 'prepositions', 'postpositions', 'noCopula', 'proDrop', 'focusMarker', 'topicMarker', 'caseMarking', 'reflexivePronouns', 'diminutives', 'augmentatives', 'ideophones', 'classifierSystem', 'tense', 'aspect', 'mood', 'personAgreement', 'politenessDistinctions', 'reduplication', 'auxiliaryVerbs', 'doubleNegation', 'interrogativeParticles');--> statement-breakpoint
CREATE TYPE "public"."feature_status" AS ENUM('present', 'absent', 'partial');--> statement-breakpoint
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