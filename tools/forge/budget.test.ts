import { describe, expect, it } from "vitest";
import { BUDGET_PER_PLANE_BYTES, formatKB, reportBudget } from "./budget";

describe("reportBudget", () => {
  it("reports a fit with overBy 0 when under budget", () => {
    const report = reportBudget(100 * 1024);
    expect(report.fits).toBe(true);
    expect(report.overBy).toBe(0);
    expect(report.budgetBytes).toBe(BUDGET_PER_PLANE_BYTES);
  });

  it("reports exactly-at-budget as fitting", () => {
    expect(reportBudget(BUDGET_PER_PLANE_BYTES).fits).toBe(true);
  });

  it("reports a miss with the real overage amount", () => {
    const over = BUDGET_PER_PLANE_BYTES + 100 * 1024;
    const report = reportBudget(over);
    expect(report.fits).toBe(false);
    expect(report.overBy).toBe(100 * 1024);
  });
});

describe("formatKB", () => {
  it("formats bytes as a rounded KB string", () => {
    expect(formatKB(512000)).toBe("500KB");
    expect(formatKB(1024)).toBe("1KB");
  });
});
