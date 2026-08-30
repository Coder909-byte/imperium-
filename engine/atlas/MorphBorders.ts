// Border morphing for era switches (PRD §8.1, M2). Pure — no React, no
// content imports. Driven imperatively from AtlasMap via refs to the
// already-rendered SVG elements; this module never creates or removes
// DOM nodes itself, it only tweens attributes on nodes it's handed.
//
// GSAP owns `opacity` (+ scale) on the held-overlay path during a
// transition and writes them as inline styles (which beat the
// .heldOverlay/.heldOverlayActive class rules by normal CSS cascade),
// then clears those inline styles on completion so the CSS classes
// regain control. It does *not* touch fill-opacity/stroke-opacity
// directly — a real Chrome trace showed animating those paint
// properties on a path inside AtlasMap's inkEdges-filtered <g> forces
// a repaint of the *entire* group every tick (130 Paint events over one
// era switch). `opacity` on a promoted layer is compositor-only; see
// AtlasMap.module.css's comment on the two-layer split this drives.
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
  /** The interactive path — always the constant "unheld" look. Its `d`
   *  morphs for retained provinces; its fill/stroke-opacity never
   *  animate (see the file header). */
  path: SVGPathElement;
  /** Always-mounted overlay carrying the constant "held" look; only its
   *  opacity (+ scale, for gained) is ever tweened. */
  heldOverlay: SVGPathElement;
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

const DURATION = 0.9;
const REDUCED_DURATION = 0.15;
const STAGGER_AMOUNT = 0.12; // total ripple spread, not per-item — stays ~flat regardless of province count
const EASE = "power2.inOut";
const CLEARED_PROPS = "transition,opacity";

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
    const overlays = input.provinces.map((p) => p.heldOverlay);
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(overlays, { clearProps: CLEARED_PROPS });
        input.onComplete?.();
      },
    });
    this.timeline = tl;

    // Freeze the CSS transition on the held-overlay's opacity for the
    // duration — otherwise the stylesheet's own `.heldOverlay` transition
    // chases every inline write GSAP makes this tick, producing a laggy
    // double-ease instead of the intended single easing curve.
    tl.set(overlays, { transition: "none" }, 0);

    const retained = input.provinces.filter((p) => classifyProvince(p) === "retained");
    const gained = input.provinces.filter((p) => classifyProvince(p) === "gained");
    const lost = input.provinces.filter((p) => classifyProvince(p) === "lost");

    // Skip provinces whose shape doesn't actually change — today's
    // content has one geometry per province across every era (PRD §8.1
    // finding, M2), so this is every retained province right now, but it
    // isn't a today-only shortcut: MorphSVGPlugin's `setAttribute('d', …)`
    // is a genuine geometry change, which is never compositor-only, no
    // matter what else in this file is. Calling it every frame with a
    // value that's already correct bought nothing and cost a full-group
    // repaint on every tick regardless (confirmed via trace: 118 Paint
    // events for one switch with retained provinces, 4 without any).
    // Real per-era geometry, once hand-authored, will make some of these
    // actually differ — those get the morph and pay its real repaint
    // cost, same as any shape animation would; provinces that still
    // don't change shape keep costing nothing, forever, automatically.
    const shapeChanged = retained.filter((province) => province.path.getAttribute("d") !== province.d);
    if (!input.reducedMotion && shapeChanged.length > 0) {
      const delays = staggerDelays(shapeChanged.length);
      // Both the interactive path and its held-overlay share the same
      // `d` always (see AtlasMap.tsx) — morph them together so the
      // wobbly inkEdges edge stays pixel-aligned between the two
      // throughout the shape change, not just at rest.
      shapeChanged.forEach((province, i) => {
        tl.to([province.path, province.heldOverlay], { morphSVG: province.d, duration, ease: EASE }, delays[i]);
      });
    }

    if (gained.length > 0) {
      const gainedOverlays = gained.map((p) => p.heldOverlay);
      // No scale-in here, deliberately — PRD §8.1 originally called for
      // gained provinces to fade *and* scale in from ~0.96. A real trace
      // confirmed the opacity fade alone is compositor-only (this file's
      // header), but adding scale/transform back in on these same
      // elements measurably reintroduced the full-group-repaint problem
      // this fix exists to solve: opacity on a child of AtlasMap's
      // inkEdges-filtered <g> is compositor-friendly, but scale on that
      // same child is not — 80 Paint events over one era switch with it,
      // 4 without. Dropping the scale flourish and keeping the fade is
      // the trade that actually gets to zero full-document repaints;
      // flagged for a decision rather than silently dropped, and worth
      // revisiting later with e.g. a per-province filter scope if the
      // scale-in is wanted back.
      tl.fromTo(gainedOverlays, { opacity: 0 }, { opacity: 1, duration, ease: EASE, stagger: { amount: STAGGER_AMOUNT, from: "random" } }, 0);
      const gainedLabels = gained.map((p) => p.label).filter((l): l is SVGTextElement => l !== null);
      if (gainedLabels.length > 0) {
        tl.fromTo(gainedLabels, { opacity: 0 }, { opacity: 1, duration, stagger: { amount: STAGGER_AMOUNT, from: "random" } }, 0);
      }
    }

    if (lost.length > 0) {
      const lostOverlays = lost.map((p) => p.heldOverlay);
      tl.to(lostOverlays, { opacity: 0, duration, ease: EASE, stagger: { amount: STAGGER_AMOUNT, from: "random" } }, 0);
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
