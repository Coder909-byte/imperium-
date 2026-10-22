import { expect, it } from "vitest";
import { cameraForBeat } from "./beatTiming";

it("leaves authored timing intact and never shortens a deliberately longer move", () => {
  const camera = { x: 0, y: 0, scale: 1, durationMs: 1000, ease: "none" };
  expect(cameraForBeat({ body: "word ".repeat(80), camera }).durationMs).toBe(1000);
  expect(cameraForBeat({ body: "short", camera: { ...camera, durationMode: "dwell", durationMs: 30000 } }).durationMs).toBe(30000);
});
