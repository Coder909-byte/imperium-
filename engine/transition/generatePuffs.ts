// Pure — no React, no DOM, no content imports. Each puff's on-screen
// position is a function of the sweep's single occlusion value (0..1)
// and these per-puff constants, computed once per CloudSweep mount so
// the parallax field doesn't reshuffle mid-transition.

export interface Puff {
  id: number;
  side: "left" | "right";
  // Scales how far this puff travels per unit of occlusion change —
  // >1 reads as closer/faster, <1 as further/slower. This alone is what
  // produces parallax: every puff shares the same driving value, they
  // just disagree on how far it carries them.
  depthMultiplier: number;
  size: number; // px
  verticalOffset: number; // px from the vertical centre
  baseOpacity: number;
  // Fraction of the sweep's occlusion range this puff waits out before
  // it starts moving — staggers the field into a ripple instead of a
  // wall of puffs snapping in lockstep with the main masses.
  startDelay: number;
}

export function generatePuffs(count: number, random: () => number = Math.random): Puff[] {
  const puffs: Puff[] = [];
  for (let i = 0; i < count; i++) {
    puffs.push({
      id: i,
      side: i % 2 === 0 ? "left" : "right",
      depthMultiplier: 0.6 + random() * 0.7,
      size: 60 + random() * 140,
      verticalOffset: (random() - 0.5) * 420,
      baseOpacity: 0.25 + random() * 0.35,
      startDelay: random() * 0.35,
    });
  }
  return puffs;
}

/** Remaps global occlusion (0..1) onto a puff's own delayed schedule. */
export function puffLocalProgress(occlusion: number, startDelay: number): number {
  if (startDelay >= 1) return 0;
  const local = (occlusion - startDelay) / (1 - startDelay);
  return Math.min(1, Math.max(0, local));
}
