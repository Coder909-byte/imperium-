import { beforeEach, describe, expect, it, vi } from "vitest";
import { MigrationRequest } from "./contracts";
import { LOCAL_PROGRESS_KEY, clearImported, readLocalProgress, rememberBeat, rememberQuiz } from "./localProgress";
import { assertIsolatedTestDatabase } from "@/lib/testDatabase";

const a = "3ad81a36-b156-402e-af0a-74a132f095f3";
const b = "c68ee1bb-1d0c-4c67-b06f-9fdcbaf2e1a8";
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
});

describe("anonymous progress is an untrusted cache of references", () => {
  it("deduplicates attempt and beat references without storing an XP claim", () => {
    rememberQuiz(a); rememberQuiz(a); rememberBeat("gallia", "the-hill"); rememberBeat("gallia", "the-hill");
    expect(readLocalProgress()).toEqual({ version: 1, sessionIds: [a], regions: [{ regionId: "gallia", beatIds: ["the-hill"] }] });
  });
  it("clears only imported records, retaining records added by another tab while import was pending", () => {
    rememberQuiz(a); rememberQuiz(b); rememberBeat("gallia", "the-hill"); rememberBeat("gallia", "second-wall");
    clearImported([a], [{ regionId: "gallia", beatIds: ["the-hill"] }]);
    expect(readLocalProgress()).toEqual({ version: 1, sessionIds: [b], regions: [{ regionId: "gallia", beatIds: ["second-wall"] }] });
  });
  it("does not silently replace corrupted or tampered local data", () => {
    storage.set(LOCAL_PROGRESS_KEY, '{"version":1,"xp":999999}');
    expect(() => readLocalProgress()).toThrow();
    expect(rememberQuiz(a)).toBe(false);
    expect(storage.get(LOCAL_PROGRESS_KEY)).toContain("999999");
  });
  it("rejects client XP, rank, score and backdated activity in a migration request", () => {
    const valid = { sessionIds: [a], regions: [] };
    expect(MigrationRequest.safeParse(valid).success).toBe(true);
    for (const field of ["xp", "rank", "score", "lastActiveDate", "streakDays"]) expect(MigrationRequest.safeParse({ ...valid, [field]: 9999 }).success).toBe(false);
    expect(MigrationRequest.safeParse({ ...valid, sessionIds: ["not-a-session"] }).success).toBe(false);
  });
  it("fails closed if local storage is unavailable", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("Blocked"); } });
    expect(rememberQuiz(a)).toBe(false);
  });
});

describe("mutating test database guard", () => {
  it("accepts only the dedicated loopback cluster/database", () => {
    const valid = "postgresql://test@127.0.0.1:55439/imperium_m9_test";
    expect(assertIsolatedTestDatabase(valid)).toBe(valid);
    for (const url of [undefined, "postgresql://test@example.neon.tech/imperium_m9_test", "postgresql://test@localhost:5432/postgres", "postgresql://test@localhost:55439/production"]) {
      expect(() => assertIsolatedTestDatabase(url)).toThrow();
    }
  });
});
