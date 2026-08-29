# 001. Drizzle over Prisma

## Context

Imperium's ORM sits in front of a serverless Postgres database (Neon) accessed from Next.js route handlers and server components running on Vercel — an environment where every request can be a cold start, and where connection setup cost is paid repeatedly rather than amortised over a long-lived process. The user-facing side of the schema is small (auth tables plus `profile`, `regionProgress`, `question`, `quizSession`, `quizAnswer`), but quiz analytics — per-question accuracy, per-beat drop-off — will eventually need SQL-shaped aggregation queries, not just CRUD through a generated client. PRD §17 named this decision as blocking M0 and recommended Drizzle; the developer's prior familiarity is with Prisma.

## Decision

Use Drizzle ORM with `drizzle-kit` for schema migrations, over Prisma. Drizzle has no code-generation step and no query engine binary — schema is plain TypeScript, and queries compile to SQL close enough to the metal that the analytics queries this product will eventually need aren't fighting the ORM's abstractions. Its cold-start footprint on serverless functions is materially smaller than Prisma's, which matters directly for the atlas-TTI and scene-first-beat performance budgets in PRD §11. The Better Auth adapter for Drizzle is first-party and was verified against the installed package version before committing to this path, rather than assumed from familiarity with Prisma's equivalent.

## Consequences

The team gives up Prisma Studio and Prisma's more mature migration-diffing UX, and every query is written by hand rather than generated from a fluent client — slower for CRUD-shaped code, a wash or better once real analytics queries show up. `db/schema.ts` is now the single source of truth for both the database shape and the TypeScript types derived from it (`typeof table.$inferSelect`), matching the project's broader convention of inferring types rather than hand-writing parallel interfaces. Migration workflow is `drizzle-kit generate` to produce a SQL file under `db/migrations/`, `drizzle-kit migrate` to apply it — `drizzle-kit push` stays available in `package.json` for throwaway local experiments but is never part of a documented flow, so the migration history on disk always matches what actually ran against the database.
