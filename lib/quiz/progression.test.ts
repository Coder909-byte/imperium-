import { describe, expect, it } from "vitest";
import { RANKS } from "@/lib/ranks";
import { PROGRESSION, rankForXP, eligibleCredits, advanceStreak, visibleStreak } from "./progression";

describe("owner-approved progression policy", () => {
  it("keeps every threshold aligned with the thematic rank order", () => {
    expect(PROGRESSION.rankThresholds).toHaveLength(RANKS.length);
    PROGRESSION.rankThresholds.forEach((threshold, index) => {
      expect(rankForXP(threshold)).toBe(RANKS[index]);
      if (index > 0) expect(rankForXP(threshold - 1)).toBe(RANKS[index - 1]);
    });
    expect(() => rankForXP(-1)).toThrow();
  });
  it("only rewards previously uncredited questions, even within a duplicate import", () => {
    expect(eligibleCredits([{ questionId: "a", difficulty: 3 }, { questionId: "b", difficulty: 2 }, { questionId: "b", difficulty: 2 }], new Set(["a"])))
      .toEqual([{ questionId: "b", xp: 20 }]);
  });
  it("uses the UTC boundary rather than client timezone, and counts the day only once", () => {
    const previous = new Date("2026-10-23T23:59:59Z");
    expect(advanceStreak(4, previous, new Date("2026-10-24T00:00:00Z"))).toBe(5);
    expect(advanceStreak(4, previous, new Date("2026-10-23T23:59:59Z"))).toBe(4);
    expect(advanceStreak(4, previous, new Date("2026-10-25T00:00:00Z"))).toBe(1);
    expect(visibleStreak(4, previous, new Date("2026-10-25T00:00:00Z"))).toBe(0);
    expect(advanceStreak(0, null, previous)).toBe(1);
  });
});
