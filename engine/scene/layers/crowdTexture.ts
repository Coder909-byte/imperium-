// A shared 4-frame march-cycle texture for CrowdField (PRD §3: "distant
// crowds are never individual rigs — instanced quads on a shared 4-frame
// march texture"). Procedural silhouettes drawn to one canvas and sliced
// into 4 sub-textures of one base Texture — no raster assets, and no
// dependency on the legionary rig: a distant crowd is small on screen
// and disposable art, not worth baking real rig poses into an atlas for.
//
// M8 note, so the option stays visible rather than silently foreclosed:
// once real forged character art exists, this is the one place that
// would need to change to derive these 4 frames from an actual rig's
// `march` clip (e.g. rendering PuppetActor to an offscreen texture at 4
// fixed clip times) instead of drawing a silhouette by hand — nothing
// about CrowdField itself would need to change, since it only ever
// consumes `Texture[]`.
import { Rectangle, Texture } from "pixi.js";

const FRAME_WIDTH = 24;
const FRAME_HEIGHT = 48;
const FRAME_COUNT = 4;

// Fraction (0..1 of frame height) the legs splay apart at each of the 4
// march poses — a simple sine-like cycle: together, apart, together,
// apart-the-other-way. Purely a silhouette; not derived from any rig.
const LEG_SPLAY = [0, 0.35, 0, -0.35];

function drawFrame(ctx: CanvasRenderingContext2D, originX: number, poseIndex: number): void {
  const cx = originX + FRAME_WIDTH / 2;
  const headR = FRAME_WIDTH * 0.22;
  const shoulderY = FRAME_HEIGHT * 0.28;
  const hipY = FRAME_HEIGHT * 0.55;
  const splay = LEG_SPLAY[poseIndex] * FRAME_WIDTH * 0.4;

  ctx.fillStyle = "rgba(40,35,28,0.88)";
  ctx.beginPath();
  ctx.ellipse(cx, headR + 1, headR, headR, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - FRAME_WIDTH * 0.18, shoulderY);
  ctx.lineTo(cx + FRAME_WIDTH * 0.18, shoulderY);
  ctx.lineTo(cx + FRAME_WIDTH * 0.12, hipY);
  ctx.lineTo(cx - FRAME_WIDTH * 0.12, hipY);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = FRAME_WIDTH * 0.14;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - splay, hipY);
  ctx.lineTo(cx - splay * 1.4, FRAME_HEIGHT - 1);
  ctx.moveTo(cx + splay, hipY);
  ctx.lineTo(cx + splay * 1.4, FRAME_HEIGHT - 1);
  ctx.stroke();
}

function createMarchCycleCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_WIDTH * FRAME_COUNT;
  canvas.height = FRAME_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  for (let i = 0; i < FRAME_COUNT; i++) drawFrame(ctx, i * FRAME_WIDTH, i);
  return canvas;
}

/** 4 Texture frames sharing one base texture/canvas — safe for
 *  ParticleContainer's `dynamicProperties.uvs`, which requires every
 *  particle's texture to come from the same underlying resource. */
export function createCrowdMarchFrames(): Texture[] {
  const base = Texture.from(createMarchCycleCanvas());
  return Array.from({ length: FRAME_COUNT }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * FRAME_WIDTH, 0, FRAME_WIDTH, FRAME_HEIGHT) }));
}
