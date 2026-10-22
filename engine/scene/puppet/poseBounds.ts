import type { LoadedRig, WorldTransform } from "./types";

/** Includes the painted rectangle around each pivot, rather than only
 * joint coordinates; a foot-origin rig must fit as well as a hip-origin one. */
export function measurePoseBounds(rig: LoadedRig, poses: readonly (readonly WorldTransform[])[]) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const pose of poses) rig.parts.forEach((part, index) => {
    const transform = pose[index];
    const cos = Math.cos(transform.rotation), sin = Math.sin(transform.rotation);
    for (const [x, y] of [[0, 0], [part.size[0], 0], [0, part.size[1]], part.size]) {
      const dx = (x - part.pivot[0]) * transform.scaleX;
      const dy = (y - part.pivot[1]) * transform.scaleY;
      const px = transform.x + cos * dx - sin * dy;
      const py = transform.y + sin * dx + cos * dy;
      left = Math.min(left, px); right = Math.max(right, px);
      top = Math.min(top, py); bottom = Math.max(bottom, py);
    }
  });
  return { x: left, y: top, width: right - left, height: bottom - top };
}
