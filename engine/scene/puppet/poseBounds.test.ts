import { expect, it } from "vitest";
import { measurePoseBounds } from "./poseBounds";
import { loadRig } from "./rigLoader";

it("fits feet-origin artwork including painted extents, rotation and mirror", () => {
  const rig = loadRig({ id: "fixture", parts: [{ id: "body", parent: null, texture: "fixture", pivot: [10, 100], size: [20, 100], zOrder: 0, rest: { x: 0, y: 0, rotation: 0, scale: 1 } }], clips: [] });
  expect(measurePoseBounds(rig, [[{ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }]])).toEqual({ x: -10, y: -100, width: 20, height: 100 });
  const rotated = measurePoseBounds(rig, [[{ x: 10, y: 20, rotation: Math.PI / 2, scaleX: -1, scaleY: 1 }]]);
  expect(rotated.x).toBeCloseTo(10);
  expect(rotated.y).toBeCloseTo(10);
  expect(rotated.width).toBeCloseTo(100);
  expect(rotated.height).toBeCloseTo(20);
});
