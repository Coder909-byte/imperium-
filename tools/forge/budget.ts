// Per-plane size budget — measured, not assumed (PRD §11's own
// instinct, applied here to the number PRD §11 itself needed). The old
// ~200KB/plane figure was an alpha-line-art-era assumption (ADR 003
// flagged it as stale the moment planes moved to colour, without
// re-measuring). This session measured a real painting (Alma-Tadema,
// "The Roses of Heliogabalus", 6000x3694 CC0) at three widths and three
// WebP qualities — see docs/art-pipeline.md's own table for the full
// grid — plus two real engravings in --matte mode, specifically because
// --matte turned out NOT to reliably undercut colour the way the old
// monochrome-era assumption implied (a densely cross-hatched etching's
// alpha channel is high-frequency detail everywhere, which compresses
// WORSE than a smooth painting's colour data at the same resolution —
// the opposite of the intuitive "line art must be lighter" assumption).
//
// The real, load-bearing constraint is PRD §11's PER-REGION total
// (2.5MB across 5-8 planes), not a fixed per-plane number — a scene's
// planes vary in resolution by depth (a blurred sky plane doesn't need
// 1920px of detail). BUDGET_PER_PLANE_BYTES is a practical per-file
// checkpoint derived from that region budget assuming a representative
// ~6-plane scene (2.5MB / 6 ≈ 427KB), rounded up slightly for headroom
// since not every plane in a real scene needs to be full-width — it's a
// useful per-file sanity flag, not a substitute for checking the whole
// region's total once a scene's planes are all forged (that check
// doesn't exist yet; tools/forge processes one file/batch at a time and
// has no notion of "this scene's other planes").
export const BUDGET_PER_PLANE_BYTES = 450 * 1024;

export interface BudgetReport {
  bytes: number;
  budgetBytes: number;
  fits: boolean;
  overBy: number; // 0 if it fits
}

export function reportBudget(bytes: number): BudgetReport {
  const fits = bytes <= BUDGET_PER_PLANE_BYTES;
  return {
    bytes,
    budgetBytes: BUDGET_PER_PLANE_BYTES,
    fits,
    overBy: fits ? 0 : bytes - BUDGET_PER_PLANE_BYTES,
  };
}

export function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)}KB`;
}
