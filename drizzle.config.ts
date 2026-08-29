import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// dotenv defaults to `.env`; this project keeps everything in `.env.local`,
// same as Next.js's own convention.
config({ path: ".env.local" });

// drizzle-kit runs as a standalone CLI, outside Next's request lifecycle,
// so it doesn't get .env.local loaded automatically — hence the explicit
// dotenv import above.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Missing required environment variable: DATABASE_URL. Set it in .env.local (see .env.example).",
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
});
