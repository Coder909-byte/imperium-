// A tiny seeded 1D value-noise generator for the camera's handheld
// drift (Camera.ts). PRD §4 calls for "1D Perlin noise" — this is value
// noise (interpolated random lattice values), not true gradient-based
// Perlin noise: visually equivalent for a slow, organic wobble, and it
// keeps this file dependency-free rather than pulling in a noise
// library, the same call CloudSweep/generatePuffs already made for
// their own randomness. No React, no content imports.

const LATTICE_SIZE = 256;

// A fixed lattice of pseudo-random values in [-1, 1], generated once per
// seed with a small deterministic PRNG (mulberry32) — deterministic so
// the same seed always produces the same drift, which is what makes
// per-axis seeds (Camera.ts) decorrelate cleanly instead of just being
// phase-shifted copies of Math.random().
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLattice(seed: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: LATTICE_SIZE }, () => rand() * 2 - 1);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * A continuous 1D noise function, seeded so different seeds decorrelate.
 * Input `x` is unbounded (typically elapsed seconds * frequency); output
 * is always in [-1, 1]. Smoothly interpolated between lattice points, so
 * small changes in `x` produce small changes in output — no popping.
 */
export function createNoise1D(seed: number): (x: number) => number {
  const lattice = buildLattice(seed);
  return (x: number) => {
    const scaled = x * 4; // lattice points per unit input — arbitrary but fixed, tunes "wiggliness" not amplitude
    const i0 = Math.floor(scaled);
    const frac = scaled - i0;
    const a = lattice[((i0 % LATTICE_SIZE) + LATTICE_SIZE) % LATTICE_SIZE];
    const b = lattice[((i0 + 1) % LATTICE_SIZE + LATTICE_SIZE) % LATTICE_SIZE];
    return a + (b - a) * smoothstep(frac);
  };
}
