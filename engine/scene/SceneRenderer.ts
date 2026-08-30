// PixiJS v8 application lifecycle (PRD §10, M4). This route gets entered
// and left constantly (atlas<->scene, every click), and browsers cap
// concurrent WebGL contexts around 8-16 — a leaked context here isn't a
// slow leak, it's a hard failure a few round trips in. Everything this
// class owns gets torn down in destroy(), including things that don't
// show up in a naive "is there still a canvas" check: the ticker keeps
// running independent of any single beat or camera move (that's the
// point of handheld drift), so an un-removed ticker callback would keep
// costing a frame of work forever, on every subsequent scene mount,
// without ever showing up as a second WebGL context.
//
// No content imports — a region's rendered content arrives already
// built as ParallaxPlane instances from ScenePlayer.
import { Application, Container, type Ticker } from "pixi.js";

export type SceneRendererStatus = "idle" | "initializing" | "ready" | "destroyed";

const DESTROY_OPTIONS = { children: true, texture: true, textureSource: true } as const;

export class SceneRenderer {
  /** Everything the camera moves lives here — planes are added as its
   *  children, never directly to the stage. */
  readonly cameraContainer = new Container();
  private status: SceneRendererStatus = "idle";
  private app: Application | null = null;

  constructor(private readonly hostElement: HTMLDivElement) {}

  getStatus(): SceneRendererStatus {
    return this.status;
  }

  /**
   * Idempotent-against-a-fast-unmount: if `destroy()` is called while
   * this is still awaiting `app.init()` (React StrictMode's dev-only
   * mount->cleanup->mount, or a genuinely fast navigation away), the
   * `status === "destroyed"` check below tears down the just-created
   * app immediately instead of ever attaching a second live canvas.
   */
  async init(): Promise<void> {
    if (this.status !== "idle") return;
    this.status = "initializing";

    const app = new Application();
    await app.init({
      resizeTo: this.hostElement,
      backgroundColor: 0x000000,
      backgroundAlpha: 1,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: "webgl",
    });

    if (this.status !== "initializing") {
      // destroy() ran while we were awaiting init — never mount.
      app.destroy({ removeView: true }, DESTROY_OPTIONS);
      return;
    }

    this.app = app;
    app.stage.addChild(this.cameraContainer);
    this.hostElement.appendChild(app.canvas);
    this.status = "ready";
  }

  getTicker(): Ticker {
    if (!this.app) throw new Error("SceneRenderer.getTicker() called before init() resolved");
    return this.app.ticker;
  }

  getStageSize(): { width: number; height: number } {
    if (!this.app) return { width: 0, height: 0 };
    return { width: this.app.renderer.width, height: this.app.renderer.height };
  }

  destroy(): void {
    if (this.status === "destroyed") return;
    const app = this.app;
    this.status = "destroyed";
    this.app = null;
    app?.destroy({ removeView: true }, DESTROY_OPTIONS);
  }
}
