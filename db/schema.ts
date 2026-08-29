import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { DEFAULT_RANK } from "@/lib/ranks";

// --- Better Auth core tables -----------------------------------------
// Field names (the JS keys) must match Better Auth's internal model
// exactly; DB column names are free to be snake_case. Shape confirmed
// against the installed `better-auth@1.7.2` + `@better-auth/drizzle-adapter`
// rather than assumed from memory.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  // Synthetic issuer Better Auth assigns per account (e.g. "local:oauth:google")
  // — required on this installed version even though the PRD's DB sketch
  // (written against an older Better Auth) didn't have it. Confirmed by
  // reading node_modules/@better-auth/core/dist/db/schema/account.mjs.
  issuer: text("issuer").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// --- App tables --------------------------------------------------------

export const profile = pgTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  xp: integer("xp").notNull().default(0),
  // Free text, not a pg enum — see lib/ranks.ts for why. Validate against
  // RankSchema at the application boundary, not the database.
  rank: text("rank").notNull().default(DEFAULT_RANK),
  streakDays: integer("streak_days").notNull().default(0),
  lastActiveDate: timestamp("last_active_date"),
  prefersReducedMotion: boolean("prefers_reduced_motion").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const regionProgress = pgTable(
  "region_progress",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    regionId: text("region_id").notNull(),
    beatsViewed: jsonb("beats_viewed").notNull().default(sql`'[]'::jsonb`),
    completedAt: timestamp("completed_at"),
    lastViewedAt: timestamp("last_viewed_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.regionId)],
);

export const question = pgTable(
  "question",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    regionId: text("region_id").notNull(),
    era: text("era").notNull(),
    difficulty: integer("difficulty").notNull(),
    prompt: text("prompt").notNull(),
    options: jsonb("options").notNull(),
    correctOptionId: text("correct_option_id").notNull(),
    explanation: text("explanation").notNull(),
    rightQuip: text("right_quip").notNull(),
    wrongQuips: jsonb("wrong_quips").notNull(),
    sources: jsonb("sources").notNull().default(sql`'[]'::jsonb`),
  },
  (table) => [check("difficulty_range", sql`${table.difficulty} between 1 and 3`)],
);

export const quizSession = pgTable("quiz_session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  regionId: text("region_id").notNull(),
  mode: text("mode").notNull(),
  score: integer("score").notNull().default(0),
  total: integer("total").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const quizAnswer = pgTable("quiz_answer", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => quizSession.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => question.id, { onDelete: "cascade" }),
  chosenOptionId: text("chosen_option_id").notNull(),
  correct: boolean("correct").notNull(),
  timeMs: integer("time_ms").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
