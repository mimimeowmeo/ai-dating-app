import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userStatus = pgEnum("user_status", ["active", "locked", "deleted"]);

export const onboardingStep = pgEnum("onboarding_step", [
  "AVATAR_REQUIRED",
  "FACE_VERIFICATION_REQUIRED",
  "PROFILE_REQUIRED",
  "PREFERENCES_REQUIRED",
  "COMPLETED",
]);

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    username: text().notNull(),
    email: text(),
    passwordHash: text("password_hash").notNull(),
    status: userStatus().notNull().default("active"),
    onboardingStep: onboardingStep("onboarding_step").notNull().default("AVATAR_REQUIRED"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_username_key").on(table.username),
    uniqueIndex("users_email_key").on(table.email),
    check("users_username_format", sql`${table.username} ~ '^[a-z0-9_]{3,30}$'`),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
