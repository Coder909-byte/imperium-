// CLI entrypoint for tools/unproject.ts — the only file in this pair that
// touches the filesystem or calls process.exit. Run with `npm run unproject`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { geoArea } from "d3-geo";
import { buildProvince, toLonLat } from "./unproject";
import { rawProvinces } from "./raw/provinces.viewbox";

const OUT_DIR = join(__dirname, "..", "content", "borders", "provinces");

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Sanity check called out explicitly when the mapping was handed over:
  // latium's centroid should land near Rome (12.5°E, 41.9°N).
  const latiumCentroid = toLonLat(rawProvinces.latium.c);
  const romeError = Math.hypot(latiumCentroid[0] - 12.4964, latiumCentroid[1] - 41.9028);
  console.log(
    `Sanity check — latium centroid → [${latiumCentroid.join(", ")}], ` +
      `Rome is [12.4964, 41.9028], error ${romeError.toFixed(3)}°`,
  );
  if (romeError > 1) {
    console.error("Error exceeds 1° — stopping before writing anything. Check the mapping.");
    process.exit(1);
  }

  let written = 0;
  for (const [id, raw] of Object.entries(rawProvinces)) {
    const province = buildProvince(id, raw);

    // Ring-winding regression guard: a correctly-wound province should
    // cover a small sliver of the sphere. A wrongly-wound ring reads as
    // "everything except this shape" — area near 4π (≈12.566 sr) — which
    // is exactly the bug buildProvince's ring reversal fixes. Bail before
    // writing anything if a province ever comes out on the wrong side.
    const area = geoArea(province.geometry);
    if (area > 2) {
      console.error(`${id}: geoArea ${area.toFixed(3)} sr looks inverted (wrong ring winding) — not writing.`);
      process.exit(1);
    }

    writeFileSync(join(OUT_DIR, `${id}.json`), `${JSON.stringify(province, null, 2)}\n`);
    written += 1;
  }
  console.log(`Wrote ${written} province file(s) to ${OUT_DIR}`);
}

main();
