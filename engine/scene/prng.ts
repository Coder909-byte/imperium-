// A tiny seeded PRNG shared by anything that needs determinism without a
// dependency — noise.ts's lattice (Camera drift/shake) and, as of M6,
// per-instance phase offsets for PuppetActor/CrowdField (see
// SceneActors.ts). Extracted out of noise.ts rather than duplicated:
// both callers want "same seed -> same sequence" for tests, decorrelated
// from any other seed's sequence.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
