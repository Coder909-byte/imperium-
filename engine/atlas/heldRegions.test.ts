import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { filterHeld, isHeld } from "./heldRegions";
import { Province } from "../../content/schema";

describe("isHeld", () => {
  it("holds for a year inside [heldFrom, heldTo]", () => {
    expect(isHeld(0, { heldFrom: -50, heldTo: 50 })).toBe(true);
  });

  it("does not hold before heldFrom", () => {
    expect(isHeld(-51, { heldFrom: -50, heldTo: 50 })).toBe(false);
  });

  it("does not hold after heldTo", () => {
    expect(isHeld(51, { heldFrom: -50, heldTo: 50 })).toBe(false);
  });

  it("holds at heldFrom and heldTo inclusive", () => {
    expect(isHeld(-50, { heldFrom: -50, heldTo: 50 })).toBe(true);
    expect(isHeld(50, { heldFrom: -50, heldTo: 50 })).toBe(true);
  });

  it("a null heldTo means still held at any later year", () => {
    expect(isHeld(10_000, { heldFrom: -50, heldTo: null })).toBe(true);
  });
});

describe("filterHeld against the real province dataset", () => {
  const dir = join(__dirname, "..", "..", "content", "borders", "provinces");
  const provinces = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => Province.parse(JSON.parse(readFileSync(join(dir, f), "utf-8"))));

  // The four M1 eras. Cross-checked against the dataset before writing
  // these numbers down, not the other way around.
  it("350 BC: only Latium is held — the near-empty-map edge case", () => {
    const held = filterHeld(provinces, -350);
    expect(held.map((p) => p.id)).toEqual(["latium"]);
  });

  it("200 BC: five provinces held, post-Punic-Wars Italy plus the islands", () => {
    const held = filterHeld(provinces, -200);
    expect(held).toHaveLength(5);
  });

  it("117 AD: the empire at its territorial height — 23 of 24 provinces", () => {
    const held = filterHeld(provinces, 117);
    expect(held).toHaveLength(23);
    expect(held.map((p) => p.id)).not.toContain("latium"); // absorbed into italia by -272
  });

  it("486 AD: nine eastern provinces survive, fifteen western ones have lapsed", () => {
    const held = filterHeld(provinces, 486);
    expect(held).toHaveLength(9);
    expect(held.map((p) => p.id).sort()).toEqual(
      ["aegyptus", "anatolia", "asia", "creta", "cyprus", "graecia", "judaea", "moesia", "syria"].sort(),
    );
  });
});
