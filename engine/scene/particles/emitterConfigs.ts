// Emitter configs (PRD §4/§10, M5): pure spawn/update math per fx kind,
// driven by ParticleField at runtime. Every emitter is continuous —
// respawn-on-death from a fixed pool — including arrow_volley, which
// this session scoped down to a continuous stream of diagonal
// arrow-streaks rather than discrete timed volleys: a genuinely
// "volley" pattern (particles departing in synchronised waves) needs a
// shared burst clock the pool doesn't otherwise need for any other
// emitter, and a continuous stream is both simpler and still a
// legitimate reading of "arrows crossing the frame". Flagged here as a
// deliberate scope cut, not an oversight.
//
// Motion constants below are eyeballed against the placeholder region,
// same "tuned by eye, not measured" honesty as Camera.ts's HANDHELD_DRIFT.
//
// Coordinate convention: (0,0) is frame CENTRE, not top-left — matching
// ParallaxPlane (anchor 0.5, positioned at its container's local origin)
// and Camera (which centres cameraContainer on the stage). x ranges
// roughly [-bounds.width/2, +bounds.width/2], y likewise with +y down.
// A first version of this file used a top-left convention (x in
// [0, width]) — every particle rendered off-frame as a result, caught
// from an actual chain-on/chain-off screenshot showing no particles at
// all, not reasoned about in the abstract.
//
// `bounds` (ScenePlayer's getBounds) is the true, unscaled stage size —
// but particles sit inside cameraContainer, which a beat's own camera
// can zoom up to ~1.3x (placeholder.json's "foreground-close" beat).
// A "source-anchored" emitter (smoke/embers/fire — meant to stay
// reliably on-screen, not drift wherever) keeps its offset from centre
// within roughly 30% of bounds.width/height, so it stays inside frame
// even multiplied by that zoom — found the hard way, by placing fire at
// 38% of height and getting a real, computed off-canvas world position
// once beat 4's 1.3x scale was actually applied, not by eyeballing a
// screenshot alone. dust/rain/arrow_volley are drift-through or
// cross-frame effects that are *supposed* to reach past the edge, so
// they're exempt from this margin.
import type { DeviceTier } from "../deviceTier";
import type { EmitterBounds, EmitterConfig, ParticleFxKind, ParticleState } from "./types";

/** Shared fade-in/hold/fade-out envelope so every emitter's particles
 *  appear and disappear smoothly instead of popping. Pure, exported for
 *  direct testing. */
export function fadeEnvelope(ageFrac: number): number {
  const t = Math.min(1, Math.max(0, ageFrac));
  if (t < 0.15) return t / 0.15;
  if (t > 0.75) return Math.max(0, (1 - t) / 0.25);
  return 1;
}

const dust: EmitterConfig = {
  id: "dust",
  baseCount: 40,
  textureKind: "soft-dot",
  spawn: (bounds, rand) => ({
    x: (rand() - 0.5) * bounds.width,
    y: (rand() - 0.5) * bounds.height,
    vx: (rand() - 0.5) * 10,
    vy: -2 - rand() * 3,
    age: 0,
    life: 6 + rand() * 6,
    rotation: 0,
    scale: 1.4 + rand() * 0.8,
    alpha: 0,
    tint: 0xd8cdb0,
  }),
  update: (s, dt, bounds) => {
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const halfWidth = bounds.width / 2;
    if (s.x < -halfWidth) s.x += bounds.width;
    else if (s.x > halfWidth) s.x -= bounds.width;
    s.alpha = fadeEnvelope(s.age / s.life) * 0.4;
  },
};

const smoke: EmitterConfig = {
  id: "smoke",
  baseCount: 14,
  textureKind: "soft-dot",
  spawn: (bounds, rand) => ({
    x: bounds.width * (rand() * 0.4 - 0.2),
    y: bounds.height * (0.12 + rand() * 0.14),
    vx: (rand() - 0.5) * 8,
    vy: -(14 + rand() * 10),
    age: 0,
    life: 3.5 + rand() * 2.5,
    rotation: (rand() - 0.5) * 0.4,
    scale: 2.2 + rand() * 0.9,
    alpha: 0,
    tint: 0x9a9184,
  }),
  update: (s, dt) => {
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.scale += dt * 0.15;
    s.alpha = fadeEnvelope(s.age / s.life) * 0.45;
  },
};

const embers: EmitterConfig = {
  id: "embers",
  baseCount: 26,
  textureKind: "soft-dot",
  spawn: (bounds, rand) => ({
    x: bounds.width * (rand() * 0.3 - 0.15),
    y: bounds.height * (0.18 + rand() * 0.08),
    vx: (rand() - 0.5) * 14,
    vy: -(30 + rand() * 30),
    age: 0,
    life: 1.2 + rand() * 1.2,
    rotation: 0,
    scale: 0.9 + rand() * 0.5,
    alpha: 0,
    tint: 0xff8a3d,
  }),
  update: (s, dt) => {
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += dt * 6; // decelerates as it rises, then drifts
    s.alpha = fadeEnvelope(s.age / s.life) * 0.9;
  },
};

const rain: EmitterConfig = {
  id: "rain",
  baseCount: 90,
  textureKind: "streak",
  spawn: (bounds, rand) => {
    const vy = 340 + rand() * 120;
    return {
      x: (rand() - 0.5) * bounds.width,
      y: -bounds.height * 0.5 - rand() * bounds.height * 0.3,
      vx: -18,
      vy,
      age: 0,
      // Roughly the time to fall past the (overscanned) frame — respawns
      // just as it exits, rather than an arbitrary fixed lifetime.
      life: (bounds.height * 1.4) / vy,
      rotation: -0.28,
      scale: 2.2 + rand() * 0.8,
      alpha: 0.6 + rand() * 0.2,
      tint: 0xbfd0e0,
    };
  },
  update: (s, dt) => {
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  },
};

const fire: EmitterConfig = {
  id: "fire",
  baseCount: 18,
  textureKind: "soft-dot",
  spawn: (bounds, rand) => ({
    x: (rand() - 0.5) * bounds.width * 0.12,
    y: bounds.height * 0.22,
    vx: (rand() - 0.5) * 16,
    vy: -(40 + rand() * 30),
    age: 0,
    life: 0.5 + rand() * 0.5,
    rotation: 0,
    scale: 2.6 + rand() * 1.1,
    alpha: 0,
    tint: 0xff6a1a,
  }),
  update: (s, dt) => {
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += dt * 40; // sharp deceleration — short flicker, not a rising column
    s.alpha = fadeEnvelope(s.age / s.life);
  },
};

const arrowVolley: EmitterConfig = {
  id: "arrow_volley",
  baseCount: 10,
  textureKind: "streak",
  spawn: (bounds, rand) => {
    const vx = 260 + rand() * 60;
    return {
      x: -bounds.width * 0.55,
      y: bounds.height * (rand() * 0.35 - 0.35),
      vx,
      vy: 40 + rand() * 20,
      age: 0,
      life: (bounds.width * 1.1) / vx,
      rotation: 0.34,
      scale: 2.2 + rand() * 0.6,
      alpha: 0.9,
      tint: 0xcbb489,
    };
  },
  update: (s, dt) => {
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  },
};

export const EMITTER_CONFIGS: Record<ParticleFxKind, EmitterConfig> = {
  dust,
  smoke,
  embers,
  rain,
  fire,
  arrow_volley: arrowVolley,
};

// Fast-forwards a freshly spawned particle to a random point in its own
// lifecycle by replaying `update` with one large dt — used only when
// filling a pool for the first time, so a field doesn't visibly pulse
// with every particle born (and later dying) in lockstep at t=0.
export function spawnAtRandomAge(config: EmitterConfig, bounds: EmitterBounds, rand: () => number): ParticleState {
  const state = config.spawn(bounds, rand);
  config.update(state, rand() * state.life, bounds);
  return state;
}

const MINIMAL_PARTICLE_COUNT = 6;

/** Pure. PRD §11: low tier halves particle counts; reduced motion (PRD
 *  §12) asks for "minimal particles", a much harder cap than a halving —
 *  the two never compound (reduced motion wins outright). */
export function resolveParticleCount(baseCount: number, tier: DeviceTier, reducedMotion: boolean): number {
  if (reducedMotion) return Math.min(baseCount, MINIMAL_PARTICLE_COUNT);
  return tier === "low" ? Math.round(baseCount / 2) : baseCount;
}
