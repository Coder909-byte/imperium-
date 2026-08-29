// Held regions are a pure function of the selected year (PRD §8.1) — no
// per-era snapshot files, just a range check against each province's own
// heldFrom/heldTo. No React, no content imports.

export interface HeldRange {
  heldFrom: number;
  heldTo: number | null;
}

export function isHeld(year: number, range: HeldRange): boolean {
  return range.heldFrom <= year && (range.heldTo === null || year <= range.heldTo);
}

export function filterHeld<T extends HeldRange>(items: readonly T[], year: number): T[] {
  return items.filter((item) => isHeld(year, item));
}
