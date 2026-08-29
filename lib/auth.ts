import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { DEFAULT_RANK } from "@/lib/ranks";
import { env } from "@/lib/env";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Every account gets a profile row the moment it exists — the
        // rest of the app (starting with /profile) assumes one is there.
        after: async (user) => {
          await db.insert(profile).values({
            userId: user.id,
            xp: 0,
            rank: DEFAULT_RANK,
            streakDays: 0,
          });
        },
      },
    },
  },
  // Lets Better Auth's server actions set cookies correctly under the
  // Next.js App Router; must be the last plugin per Better Auth's docs.
  plugins: [nextCookies()],
});
