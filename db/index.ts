import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// The only file that knows the DB driver is postgres.js over TCP. On
// Vercel functions @neondatabase/serverless (HTTP) is the better fit —
// swapping to it later means changing this file only, nothing that
// imports `db`.
//
// `prepare: false` because Neon's pooled connection runs pgbouncer in
// transaction mode, which prepared statements can't survive.
export const sql = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(sql, { schema });
