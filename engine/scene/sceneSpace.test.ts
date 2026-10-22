import { describe, expect, it } from "vitest";
import { Container } from "pixi.js";
import { Camera } from "./Camera";
import { frameSceneCamera, SCENE_OVERSCAN, SCENE_SPACE } from "./sceneSpace";

describe("one art/actor composition across viewport sizes", () => {
  it("keeps the viewport covered during extreme pans, zoom-outs and motion", () => {
    for (const stage of [{ width: 1440, height: 622 }, { width: 390, height: 320 }, { width: 844, height: 280 }]) {
      for (const scale of [0.5, 0.86, 1.32]) for (const x of [-1, 1]) for (const y of [-1, 1]) {
        const frame = frameSceneCamera({ x, y, scale }, stage);
        const halfWidth = SCENE_SPACE.width * SCENE_OVERSCAN * frame.scale / 2;
        const halfHeight = SCENE_SPACE.height * SCENE_OVERSCAN * frame.scale / 2;
        expect(halfWidth - Math.abs(frame.x)).toBeGreaterThanOrEqual(stage.width / 2 + 15);
        expect(halfHeight - Math.abs(frame.y)).toBeGreaterThanOrEqual(stage.height / 2 + 15);
      }
    }
  });

  it("reframes the existing camera on resize without replaying a beat or adding a ticker", () => {
    const callbacks = new Set<() => void>();
    const ticker = { add: (fn: () => void) => callbacks.add(fn), remove: (fn: () => void) => callbacks.delete(fn) };
    const container = new Container();
    let stage = { width: 1280, height: SCENE_SPACE.height };
    const camera = new Camera(container, ticker, () => stage);
    camera.setReducedMotion(true);
    camera.animateTo({ x: 0.3, y: -0.2, scale: 1.1, durationMs: 20000, ease: "none" });
    for (const tick of callbacks) tick();
    const initialScale = container.scale.x;
    stage = { width: 390, height: 320 };
    for (const tick of callbacks) tick();
    const expected = frameSceneCamera({ x: 0.3, y: -0.2, scale: 1.1 }, stage);
    expect(container.scale.x).toBeLessThan(initialScale);
    expect(container.x).toBeCloseTo(stage.width / 2 + expected.x);
    expect(container.y).toBeCloseTo(stage.height / 2 + expected.y);
    expect(container.rotation).toBe(0);
    expect(callbacks.size).toBe(1);
    camera.destroy();
    expect(callbacks.size).toBe(0);
  });
});
