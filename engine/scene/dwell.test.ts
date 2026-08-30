import { describe, expect, it } from "vitest";
import { computeAutoplayDwellMs } from "./dwell";

describe("computeAutoplayDwellMs", () => {
  it("floors at 7000ms for a short body", () => {
    const body = "Short beat body text, well under the floor.";
    expect(computeAutoplayDwellMs(body)).toBe(7000);
  });

  it("exceeds the floor for a long body, scaled by word count", () => {
    const body = Array.from({ length: 100 }, () => "word").join(" ");
    // 100 / 3.2 * 1000 + 2500 = 33750
    expect(computeAutoplayDwellMs(body)).toBeCloseTo(33750, 0);
  });

  it("a longer body always dwells at least as long as a shorter one", () => {
    const short = Array.from({ length: 40 }, () => "word").join(" ");
    const long = Array.from({ length: 120 }, () => "word").join(" ");
    expect(computeAutoplayDwellMs(long)).toBeGreaterThan(computeAutoplayDwellMs(short));
  });

  it("handles an empty body without throwing", () => {
    expect(computeAutoplayDwellMs("")).toBe(7000);
  });
});
