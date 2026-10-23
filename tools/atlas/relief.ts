import type { GeoProjection } from "d3-geo";

export interface RasterGrid { width: number; height: number; channels: number; data: Uint8Array }

// Natural Earth's .tfw describes centres of pixels in global WGS84.
export function geographicPixel(lon: number, lat: number, width: number, height: number): [number, number] {
  return [(lon + 180) / 360 * width - .5, (90 - lat) / 180 * height - .5];
}

export function sampleBilinear(grid: RasterGrid, x: number, y: number, channel: number): number {
  const cx = Math.max(0, Math.min(grid.width - 1, x));
  const cy = Math.max(0, Math.min(grid.height - 1, y));
  const x0 = Math.floor(cx), y0 = Math.floor(cy);
  const x1 = Math.min(x0 + 1, grid.width - 1), y1 = Math.min(y0 + 1, grid.height - 1);
  const fx = cx - x0, fy = cy - y0;
  const at = (px: number, py: number) => grid.data[(py * grid.width + px) * grid.channels + channel];
  return at(x0, y0) * (1 - fx) * (1 - fy) + at(x1, y0) * fx * (1 - fy) + at(x0, y1) * (1 - fx) * fy + at(x1, y1) * fx * fy;
}

export function reprojectRelief(grid: RasterGrid, projection: GeoProjection, viewport: { width: number; height: number }, scale: number): Uint8Array {
  if (!projection.invert) throw new Error("Relief needs an invertible map projection");
  const width = viewport.width * scale, height = viewport.height * scale;
  const output = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const point = projection.invert([(x + .5) / scale, (y + .5) / scale]);
      if (!point || !point.every(Number.isFinite)) throw new Error("Invalid inverse projection sample");
      const [sx, sy] = geographicPixel(point[0], point[1], grid.width, grid.height);
      for (let c = 0; c < 3; c++) output[(y * width + x) * 3 + c] = Math.round(sampleBilinear(grid, sx, sy, c));
    }
  }
  return output;
}
