// Border morphing for era switches (PRD §8.1, M2). Pure — no React, no
// content imports. Driven imperatively from AtlasMap via refs to the
// already-rendered SVG elements; this module never creates or removes
// DOM nodes itself, it only tweens attributes on nodes it's handed.
//
// GSAP owns fill-opacity/stroke-opacity/scale during a transition and
// writes them as inline styles (which beat the .held/.unheld class rules
// by normal CSS cascade), then clears those inline styles on completion
// so the CSS classes — and the .hovered interaction — regain control.
// The `d` attribute is different: MorphSVGPlugin writes it directly via
// setAttribute, not through the style cascade, so nothing needs clearing
// there.
import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

let registered = false;

function ensureRegistered(): void {
  if (!registered) {
    gsap.registerPlugin(MorphSVGPlugin);
    registered = true;
  }
}

export type ProvinceStatus = "retained" | "gained" | "lost" | "unheld";

export function classifyProvince(state: { heldBefore: boolean; heldAfter: boolean }): ProvinceStatus {
  if (state.heldBefore && state.heldAfter) return "retained";
  if (!state.heldBefore && state.heldAfter) return "gained";
  if (state.heldBefore && !state.heldAfter) return "lost";
  return "unheld";
}

export interface ProvinceMorphElement {
  id: string;
  path: SVGPathElement;
  label: SVGTextElement | null;
  /** Target path for the destination era. Equal to the current `d` for
   *  every province in today's placeholder content (one geometry per
   *  province, era only gates held/unheld — see PRD §8.1 finding, M2) —
   *  kept as an explicit input so real per-era geometry drops in later
   *  with no change here. */
  d: string;
  heldBefore: boolean;
  heldAfter: boolean;
}

export interface BorderTransitionInput {
  provinces: readonly ProvinceMorphElement[];
  eraLabelEl: SVGTextElement | null;
  reducedMotion: boolean;
  onComplete?: () => void;
}

const HELD_OPACITY = { fillOpacity: 0.55, strokeOpacity: 1 };
const UNHELD_OPACITY = { fillOpacity: 0, strokeOpacity: 0.25 };
const DURATION = 0.9;
const REDUCED_DURATION = 0.15;
const STAGGER_AMOUNT = 0.12; // total ripple spread, not per-item — stays ~flat regardless of province count
const EASE = "power2.inOut";
const CLEARED_PROPS = "transition,fillOpacity,strokeOpacity,scale,transformOrigin";

// GSAP's `stagger` option only auto-distributes across one tween call
// sharing a single target value — the retained group needs a different
// `d` per province, so it gets one `.to()` call per path instead of one
// array call, and needs its own stagger math. This is a hand-rolled
// equivalent of `stagger: { amount, from: "random" }`: evenly spaced
// delays across [0, amount], then shuffled onto elements, so it ripples
// rather than sweeping strictly left-to-right.
function staggerDelays(count: number): number[] {
  if (count <= 1) return [0];
  const step = STAGGER_AMOUNT / (count - 1);
  const delays = Array.from({ length: count }, (_, i) => i * step);
  for (let i = delays.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [delays[i], delays[j]] = [delays[j], delays[i]];
  }
  return delays;
}

/**
 * Owns one live GSAP timeline for the atlas's era-switch transition.
 * Rapid clicking is handled by always killing the previous timeline
 * before building a new one — GSAP's `.to()`/`.fromTo()` read the
 * element's *current* live value as their start point, so a new
 * transition naturally continues from wherever the last one was
 * interrupted rather than queuing behind it.
 */
export class BorderMorph {
  private timeline: gsap.core.Timeline | null = null;

  transition(input: BorderTransitionInput): void {
    ensureRegistered();
    this.timeline?.kill();

    const duration = input.reducedMotion ? REDUCED_DURATION : DURATION;
    const paths = input.provinces.map((p) => p.path);
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(paths, { clearProps: CLEARED_PROPS });
        input.onComplete?.();
      },
    });
    this.timeline = tl;

    // Freeze the CSS transition on fill-opacity/stroke-opacity for the
    // duration — otherwise the stylesheet's own `.province` transition
    // chases every inline write GSAP makes this tick, producing a
    // laggy double-ease instead of the intended single easing curve.
    tl.set(paths, { transition: "none" }, 0);

    const retained = input.provinces.filter((p) => classifyProvince(p) === "retained");
    const gained = input.provinces.filter((p) => classifyProvince(p) === "gained");
    const lost = input.provinces.filter((p) => classifyProvince(p) === "lost");

    if (!input.reducedMotion && retained.length > 0) {
      const delays = staggerDelays(retained.length);
      retained.forEach((province, i) => {
        tl.to(province.path, { morphSVG: province.d, duration, ease: EASE }, delays[i]);
      });
    }

    if (gained.length > 0) {
      const gainedPaths = gained.map((p) => p.path);
      tl.fromTo(
        gainedPaths,
        { ...UNHELD_OPACITY, scale: 0.96, transformOrigin: "50% 50%" },
        { ...HELD_OPACITY, scale: 1, duration, ease: EASE, stagger: { amount: STAGGER_AMOUNT, from: "random" } },
        0,
      );
      const gainedLabels = gained.map((p) => p.label).filter((l): l is SVGTextElement => l !== null);
      if (gainedLabels.length > 0) {
        tl.fromTo(gainedLabels, { opacity: 0 }, { opacity: 1, duration, stagger: { amount: STAGGER_AMOUNT, from: "random" } }, 0);
      }
    }

    if (lost.length > 0) {
      const lostPaths = lost.map((p) => p.path);
      tl.to(lostPaths, { ...UNHELD_OPACITY, duration, ease: EASE, stagger: { amount: STAGGER_AMOUNT, from: "random" } }, 0);
      const lostLabels = lost.map((p) => p.label).filter((l): l is SVGTextElement => l !== null);
      if (lostLabels.length > 0) {
        tl.to(lostLabels, { opacity: 0, duration, stagger: { amount: STAGGER_AMOUNT, from: "random" } }, 0);
      }
    }

    // The era label's own text content is owned by React (re-rendered
    // synchronously on the eraOrder state change that triggers this
    // transition) — it flips the instant this function is called, not
    // at the end of the tween. That's fine: the label is dipping through
    // opacity 0 at the midpoint of this same tween, so the swap happens
    // while it's invisible. No text manipulation needed here.
    if (input.eraLabelEl) {
      const half = duration / 2;
      tl.to(input.eraLabelEl, { opacity: 0, duration: half, ease: "power1.in" }, 0).to(
        input.eraLabelEl,
        { opacity: 1, duration: half, ease: "power1.out" },
        half,
      );
    }
  }

  /** Stop any in-flight transition without starting a new one — used on unmount. */
  kill(): void {
    this.timeline?.kill();
    this.timeline = null;
  }
}
