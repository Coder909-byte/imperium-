import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadAtlasContent } from "./loadContent";
import { buildAtlasProps } from "./buildAtlasProps";
import { loadProvinceMeta } from "../scene/[regionId]/loadProvince";
import { loadRegionContent } from "../scene/[regionId]/loadContent";

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return { ...fs, readFileSync: vi.fn(fs.readFileSync) };
});

describe("atlas scene availability", () => {
  it("lists both authored atlas previews and keeps engine fixtures out of the catalog", () => {
    const content = loadAtlasContent();
    const props = buildAtlasProps(content);
    expect(content.provinces).toHaveLength(24);
    expect(content.regions.map((region) => region.id)).toEqual(["gallia", "italia"]);
    expect(props.provinces.filter((province) => province.scene !== null)).toMatchObject([
      { id: "gallia", scene: { beatCount: 6, year: "52 BC" } },
      { id: "italia", scene: { beatCount: 6, year: "January 49 BC" } },
    ]);
    expect(props.provinces.filter((province) => province.scene === null)).toHaveLength(22);
  });

  it("preserves metadata for every actual province ID, including Africa's underscore", () => {
    const dir = join(process.cwd(), "content", "borders", "provinces");
    const ids = readdirSync(dir).filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5));
    for (const id of ids) expect(loadProvinceMeta(id)?.id).toBe(id);
    expect(loadProvinceMeta("africa_prov")?.latinName).toBe("Africa Proconsularis");
    expect(loadRegionContent("africa_prov")).toBeNull();
    expect(loadProvinceMeta("../gallia")).toBeNull();
    expect(loadRegionContent("../gallia")).toBeNull();
  });

  it("does not misreport malformed authored content as an unauthored province", () => {
    vi.mocked(readFileSync).mockReturnValueOnce("{}");
    expect(() => loadRegionContent("gallia")).toThrow();
  });

  it("rejects authored content routed under a different ID", () => {
    const region = loadRegionContent("gallia");
    vi.mocked(readFileSync).mockReturnValueOnce(JSON.stringify({ ...region, id: "wrong-region" }));
    expect(() => loadRegionContent("gallia")).toThrow("Region ID does not match its filename: gallia");
  });
});
