import { z } from "zod";

// Gamification ranks, ordered lowest to highest. Stored as plain `text` in
// `profile.rank` (not a Postgres enum) because this list will get tweaked —
// enum values can't be removed, and adding one needs an ALTER TYPE. This
// array is the single source of truth; the DB just stores whatever string
// it's given and trusts this schema to police it.
export const RANKS = [
  "Tiro",
  "Miles",
  "Immunis",
  "Optio",
  "Centurio",
  "Primus Pilus",
  "Legatus",
] as const;

export const RankSchema = z.enum(RANKS);

export type Rank = z.infer<typeof RankSchema>;

export const DEFAULT_RANK: Rank = RANKS[0];
