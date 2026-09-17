CREATE TYPE "public"."onboarding_step" AS ENUM('AVATAR_REQUIRED', 'FACE_VERIFICATION_REQUIRED', 'PROFILE_REQUIRED', 'PREFERENCES_REQUIRED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'locked', 'deleted');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"onboarding_step" "onboarding_step" DEFAULT 'AVATAR_REQUIRED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_username_format" CHECK ("users"."username" ~ '^[a-z0-9_]{3,30}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");