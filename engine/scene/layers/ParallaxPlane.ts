// A single depth-ranked plane (PRD §4/§10, M4): a sprite, a pointer-
// parallax offset scaled by depth, and runtime tint via ColorMatrixFilter.
// The filter list is built once in the constructor and never rebuilt —
// "never rebuild a filter per frame" applies to Pixi exactly as it does
// to the atlas's SVG filters; every subsequent frame only ever mutates
// container/sprite transform properties.
import { gsap } from "gsap";
import { BlurFilter, ColorMatrixFilter, Container, Sprite, type Texture } from "pixi.js";

// Not from the PRD — "pointer offset scales with depth" doesn't name a
// magnitude. Tuned by eye alongside the placeholder region; expected to
// move once real art (denser detail, less abstract than flat rectangles)
// makes "too much" or "too little" easier to judge.
export const PARALLAX_STRENGTH_PX = 22;

export interface ParallaxOffset {
  x: number;
  y: number;
}

/** Pure — exported for unit testing without a Sprite/Container. */
export function computeParallaxOffset(depth: number, pointerX: number, pointerY: number, strengthPx: number = PARALLAX_STRENGTH_PX): ParallaxOffset {
  return { x: pointerX * depth * strengthPx, y: pointerY * depth * strengthPx };
}

export interface ParallaxPlaneOptions {
  id: string;
  depth: number;
  texture: Texture;
  /** Hex colour, e.g. "#8a7a63" — see types.ts's ScenePlane.tint comment. */
  tint?: string;
  /** Blur strength in px. Omitted or 0 skips the filter — a no-op filter
   *  still costs a render pass. */
  blur?: number;
}

export class ParallaxPlane {
  readonly id: string;
  readonly depth: number;
  /** What ScenePlayer positions at stage-centre and adds to the camera's
   *  container. Pointer parallax is applied to the *sprite* inside it,
   *  not to this container, so it composes independently of wherever
   *  the container itself sits. */
  readonly container: Container;
  private readonly sprite: Sprite;
  private visible = false;
  private fadeTween: gsap.core.Tween | null = null;
  // Vertical rest position set by setSize (ScenePlayer uses this to
  // bottom-anchor a shorter band so a taller/farther plane peeks out
  // above it — a full-bleed rectangle per plane would make every plane
  // but the frontmost one permanently invisible, which would make
  // depth-scaled parallax impossible to actually see). Pointer offset
  // adds on top of this rather than replacing it.
  private baseOffsetY = 0;

  constructor(options: ParallaxPlaneOptions) {
    this.id = options.id;
    this.depth = options.depth;
    this.sprite = new Sprite(options.texture);
    this.sprite.anchor.set(0.5);

    const filters = [];
    if (options.tint) {
      const colorMatrix = new ColorMatrixFilter();
      colorMatrix.tint(options.tint);
      filters.push(colorMatrix);
    }
    if (options.blur && options.blur > 0) {
      filters.push(new BlurFilter({ strength: options.blur }));
    }
    this.sprite.filters = filters;

    this.container = new Container();
    this.container.alpha = 0; // ScenePlayer's first beat effect makes the initially-visible set visible
    this.container.addChild(this.sprite);
  }

  /** Sizes the placeholder rect and sets its vertical rest offset
   *  (0 = centred; positive = shifted down, for a bottom-anchored band).
   *  Real forged art (M7) will size itself from the source image
   *  instead, at baseOffsetY 0. */
  setSize(width: number, height: number, baseOffsetY = 0): void {
    this.sprite.width = width;
    this.sprite.height = height;
    this.baseOffsetY = baseOffsetY;
    this.sprite.y = baseOffsetY;
  }

  setPointerOffset(pointerX: number, pointerY: number): void {
    const offset = computeParallaxOffset(this.depth, pointerX, pointerY);
    this.sprite.x = offset.x;
    this.sprite.y = this.baseOffsetY + offset.y;
  }

  setVisible(visible: boolean, durationMs: number): void {
    if (visible === this.visible) return;
    this.visible = visible;
    this.fadeTween?.kill();
    if (durationMs <= 0) {
      this.container.alpha = visible ? 1 : 0;
      return;
    }
    this.fadeTween = gsap.to(this.container, { alpha: visible ? 1 : 0, duration: durationMs / 1000, ease: "power1.inOut" });
  }

  destroy(): void {
    this.fadeTween?.kill();
    this.container.destroy({ children: true, texture: true, textureSource: true });
  }
}
