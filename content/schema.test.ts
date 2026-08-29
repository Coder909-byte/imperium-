import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Region, Question, Province } from "./schema";

describe("Region schema", () => {
  it("accepts the gallia fixture", () => {
    const raw = readFileSync(
      join(__dirname, "regions", "gallia.json"),
      "utf-8",
    );
    const result = Region.safeParse(JSON.parse(raw));
    expect(result.success).toBe(true);
  });

  it("rejects a region with zero beats", () => {
    const result = Region.safeParse({
      id: "empty",
      name: "Empty",
      latinName: "Vacuum",
      civilisation: "Rome",
      mapCentroid: [0, 0],
      heldFrom: -50,
      heldTo: null,
      scene: { lut: "x", ambientBed: "x", planes: [] },
      beats: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a beat body shorter than 180 characters", () => {
    const result = Region.safeParse({
      id: "short",
      name: "Short",
      latinName: "Brevis",
      civilisation: "Rome",
      mapCentroid: [0, 0],
      heldFrom: -50,
      heldTo: null,
      scene: { lut: "x", ambientBed: "x", planes: [] },
      beats: [
        {
          id: "b1",
          year: "50 BC",
          sortYear: -50,
          headline: "Too short",
          body: "Not nearly long enough.",
          visibleLayers: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("Question schema", () => {
  const base = {
    id: "q1",
    regionId: "gallia",
    era: "Republic",
    difficulty: 2,
    prompt: "How long did the conquest of Gaul take?",
    options: [
      { id: "a", text: "8 years" },
      { id: "b", text: "20 years" },
    ],
    correctOptionId: "a",
    explanation: "Eight years, per Caesar's own account.",
    rightQuip: "Correct — eight years, and he wrote the book on it. Literally.",
    wrongQuips: { b: "Twenty years is a senatorial career, not a campaign." },
  };

  it("accepts a well-formed question", () => {
    expect(Question.safeParse(base).success).toBe(true);
  });

  it("rejects a correctOptionId not present in options", () => {
    const result = Question.safeParse({ ...base, correctOptionId: "z" });
    expect(result.success).toBe(false);
  });

  it("rejects a wrongQuips entry missing for a wrong option", () => {
    const result = Question.safeParse({ ...base, wrongQuips: {} });
    expect(result.success).toBe(false);
  });

  it("rejects a wrongQuips key that isn't a real option id", () => {
    const result = Question.safeParse({
      ...base,
      wrongQuips: { ...base.wrongQuips, z: "not a real option" },
    });
    expect(result.success).toBe(false);
  });
});

describe("Province schema", () => {
  it("accepts the gallia province fixture written by tools/unproject.ts", () => {
    const raw = readFileSync(
      join(__dirname, "borders", "provinces", "gallia.json"),
      "utf-8",
    );
    const result = Province.safeParse(JSON.parse(raw));
    expect(result.success).toBe(true);
  });

  const validGeometry = {
    type: "Polygon" as const,
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  };

  it("rejects heldTo before heldFrom", () => {
    const result = Province.safeParse({
      id: "backwards",
      name: "Backwards",
      latinName: "Retro",
      heldFrom: 100,
      heldTo: 50,
      geometry: validGeometry,
      labelCentroid: [0.5, 0.3],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a null heldTo for a province still held at the latest era", () => {
    const result = Province.safeParse({
      id: "still-held",
      name: "Still Held",
      latinName: "Adhuc Tenetur",
      heldFrom: -50,
      heldTo: null,
      geometry: validGeometry,
      labelCentroid: [0.5, 0.3],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a ring with fewer than 4 positions", () => {
    const result = Province.safeParse({
      id: "too-few-points",
      name: "Too Few Points",
      latinName: "Pauca Puncta",
      heldFrom: -50,
      heldTo: null,
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 1], [0, 0]]] },
      labelCentroid: [0.5, 0.3],
    });
    expect(result.success).toBe(false);
  });
});
