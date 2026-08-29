// Pure conversion library: turns the hand-drawn viewBox-space province
// prototypes in tools/raw/provinces.viewbox.ts into real lon/lat GeoJSON
// Province content. No side effects on import — see tools/unproject.cli.ts
// for the script that actually writes files.
//
// The prototypes were drawn against a plain linear lon/lat mapping (not a
// d3 projection — there is nothing to `.invert()`), so the conversion is
// arithmetic: two straight-line equations, inverted. See
// tools/raw/provinces.viewbox.ts for the forward equations this undoes.
import { geoArea } from "d3-geo";
import { Province } from "../content/schema";
import { FORWARD, type RawProvince } from "./raw/provinces.viewbox";

export function toLonLat([x, y]: [number, number]): [number, number] {
  const lon = x / FORWARD.lonScale - FORWARD.lonOffset;
  const lat = FORWARD.latOrigin - y / FORWARD.latScale;
  return [round(lon), round(lat)];
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000; // 3dp — well past what a hand-drawn line justifies
}

// Parses "M x,y L x,y L x,y ... Z" into a point list. The prototypes are
// all single-ring straight-edged polygons — no curves, no subpaths — so a
// strict M/L/Z-only parser is correct here; anything else should fail
// loudly rather than silently drop a curve.
export function parsePathPoints(d: string): Array<[number, number]> {
  const tokens = d.trim().replace(/,/g, " ").split(/\s+/).filter(Boolean);
  const points: Array<[number, number]> = [];
  let i = 0;
  let sawClose = false;

  while (i < tokens.length) {
    const command = tokens[i];
    if (command === "M" || command === "L") {
      const x = Number(tokens[i + 1]);
      const y = Number(tokens[i + 2]);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        throw new Error(`Malformed ${command} command in path: "${d}"`);
      }
      points.push([x, y]);
      i += 3;
    } else if (command === "Z") {
      sawClose = true;
      i += 1;
    } else {
      throw new Error(`Unsupported path command "${command}" in "${d}" — only M/L/Z are handled`);
    }
  }

  if (!sawClose) {
    throw new Error(`Path is not closed with Z: "${d}"`);
  }
  return points;
}

// GeoJSON's right-hand rule needs a ring's winding direction to match
// which side is "inside" — get it backwards and a small province reads
// as "everything except this shape", ~4π steradians. The 24 prototypes
// weren't all hand-drawn in the same rotational direction (tracing a
// shape by eye doesn't reliably go one way), and toLonLat's y-axis flip
// (SVG y grows downward, latitude grows upward — a reflection) reverses
// whatever winding each one had. Rather than assume a fixed direction,
// self-correct per-province: a real province is always the smaller of a
// ring and its complement, so reverse whenever area says otherwise.
function ensureSmallerSide(ring: Array<[number, number]>): Array<[number, number]> {
  const area = geoArea({ type: "Polygon", coordinates: [[...ring, ring[0]]] });
  return area > 2 * Math.PI ? [...ring].reverse() : ring;
}

export function buildProvince(id: string, raw: RawProvince): Province {
  const ring = ensureSmallerSide(parsePathPoints(raw.d).map(toLonLat));
  ring.push(ring[0]); // GeoJSON linear rings must be explicitly closed

  const province: Province = {
    id,
    name: raw.name,
    latinName: raw.latin,
    heldFrom: raw.from,
    heldTo: raw.to ?? null,
    geometry: { type: "Polygon", coordinates: [ring] },
    labelCentroid: toLonLat(raw.c),
  };

  const result = Province.safeParse(province);
  if (!result.success) {
    throw new Error(
      `${id} failed Province schema validation:\n` +
        result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n"),
    );
  }
  return result.data;
}
