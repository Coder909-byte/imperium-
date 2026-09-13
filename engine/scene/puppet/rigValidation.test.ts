import { describe, expect, it } from "vitest";
import { lintRig } from "./rigValidation";
import { loadRig } from "./rigLoader";
import type { RigDef } from "./types";

function findIssue(issues: ReturnType<typeof lintRig>, check: string, clipId?: string) {
  return issues.find((issue) => issue.check === check && (clipId === undefined || issue.clipId === clipId));
}

// A minimal biped: pelvis root, two leg chains (leg -> foot), mirrored
// left/right — enough structure to exercise midline/ground/symmetry
// without legionary.json's full 13-part rig.
function bipedWithClips(clips: RigDef["clips"]): RigDef {
  return {
    id: "biped",
    parts: [
      { id: "pelvis", parent: null, texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 0, rotation: 0, scale: 1 } },
      { id: "legL", parent: "pelvis", texture: "t", pivot: [0, 0], size: [10, 40], zOrder: 0, rest: { x: -20, y: 0, rotation: 0, scale: 1 } },
      { id: "footL", parent: "legL", texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 40, rotation: 0, scale: 1 } },
      { id: "legR", parent: "pelvis", texture: "t", pivot: [0, 0], size: [10, 40], zOrder: 0, rest: { x: 20, y: 0, rotation: 0, scale: 1 } },
      { id: "footR", parent: "legR", texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 40, rotation: 0, scale: 1 } },
    ],
    clips,
  };
}

describe("lintRig — continuity", () => {
  it("flags a looping clip whose t:1 rotation doesn't match its t:0 rotation", () => {
    const def = bipedWithClips([
      { id: "pop", durationMs: 500, loop: true, tracks: { legL: [{ t: 0, rot: 0, ease: "none" }, { t: 1, rot: 45, ease: "none" }] } },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "continuity")).toBeDefined();
  });

  it("doesn't flag a clean loop whose t:0 and t:1 values match", () => {
    const def = bipedWithClips([
      { id: "clean", durationMs: 500, loop: true, tracks: { legL: [{ t: 0, rot: -30, ease: "none" }, { t: 0.5, rot: 30, ease: "none" }, { t: 1, rot: -30, ease: "none" }] } },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "continuity")).toBeUndefined();
  });

  it("doesn't flag a mismatched non-looping clip — it's meant to hold its final pose", () => {
    const def = bipedWithClips([
      { id: "settle", durationMs: 500, loop: false, tracks: { legL: [{ t: 0, rot: 0, ease: "none" }, { t: 1, rot: 45, ease: "none" }] } },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "continuity")).toBeUndefined();
  });
});

describe("lintRig — midline crossing", () => {
  it("flags a leg swung far enough to put its foot on the wrong side of the root", () => {
    const def = bipedWithClips([
      {
        id: "overswing",
        durationMs: 500,
        loop: true,
        tracks: { legL: [{ t: 0, rot: 0, ease: "none" }, { t: 0.5, rot: -140, ease: "none" }, { t: 1, rot: 0, ease: "none" }] },
      },
    ]);
    const issues = lintRig(loadRig(def));
    const issue = findIssue(issues, "midline");
    expect(issue).toBeDefined();
    expect(issue?.partId).toBe("footL");
  });

  it("doesn't flag a normal stride that stays on its own side", () => {
    const def = bipedWithClips([
      { id: "walk", durationMs: 500, loop: true, tracks: { legL: [{ t: 0, rot: -30, ease: "none" }, { t: 0.5, rot: 30, ease: "none" }, { t: 1, rot: -30, ease: "none" }] } },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "midline")).toBeUndefined();
  });

  it("respects an explicit midlineExemptParts opt-out", () => {
    const def = bipedWithClips([
      {
        id: "thrust",
        durationMs: 500,
        loop: false,
        midlineExemptParts: ["footL"],
        tracks: { legL: [{ t: 0, rot: 0, ease: "none" }, { t: 1, rot: -140, ease: "none" }] },
      },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "midline")).toBeUndefined();
  });
});

describe("lintRig — reach envelope", () => {
  it("flags a part whose dx/dy pushes it far past its rest distance from its parent", () => {
    const def: RigDef = {
      id: "reach",
      parts: [
        { id: "root", parent: null, texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 0, rotation: 0, scale: 1 } },
        { id: "child", parent: "root", texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 50, rotation: 0, scale: 1 } },
      ],
      clips: [{ id: "stretch", durationMs: 500, loop: false, tracks: { child: [{ t: 0, rot: 0, dx: 0, dy: 0, ease: "none" }, { t: 1, rot: 0, dx: 200, dy: 0, ease: "none" }] } }],
    };
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "reach")).toBeDefined();
  });

  it("doesn't flag a small root-level bob-sized translation", () => {
    const def: RigDef = {
      id: "reach",
      parts: [
        { id: "root", parent: null, texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 0, rotation: 0, scale: 1 } },
        { id: "child", parent: "root", texture: "t", pivot: [0, 0], size: [10, 10], zOrder: 0, rest: { x: 0, y: 50, rotation: 0, scale: 1 } },
      ],
      clips: [{ id: "bob", durationMs: 500, loop: false, tracks: { child: [{ t: 0, rot: 0, dx: 0, dy: 0, ease: "none" }, { t: 1, rot: 0, dx: 5, dy: 0, ease: "none" }] } }],
    };
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "reach")).toBeUndefined();
  });

  it("never flags the root itself, however far it's displaced (ADR 007's whole-body-displacement use case)", () => {
    const def = bipedWithClips([
      { id: "fall", durationMs: 500, loop: false, tracks: { pelvis: [{ t: 0, rot: 0, dx: 0, dy: 0, ease: "none" }, { t: 1, rot: 80, dx: 30, dy: 300, ease: "none" }] } },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "reach")).toBeUndefined();
  });
});

describe("lintRig — ground contact", () => {
  it("flags a locomotion clip that lifts the whole rig off its rest ground line", () => {
    const def = bipedWithClips([
      {
        id: "floating",
        durationMs: 500,
        loop: true,
        locomotion: true,
        tracks: { pelvis: [{ t: 0, rot: 0, dx: 0, dy: -100, ease: "none" }, { t: 1, rot: 0, dx: 0, dy: -100, ease: "none" }] },
      },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "ground")).toBeDefined();
  });

  it("doesn't flag a normal stride where the legs stay near rest ground level", () => {
    const def = bipedWithClips([
      {
        id: "walk",
        durationMs: 500,
        loop: true,
        locomotion: true,
        tracks: {
          legL: [{ t: 0, rot: -30, ease: "none" }, { t: 0.5, rot: 30, ease: "none" }, { t: 1, rot: -30, ease: "none" }],
          legR: [{ t: 0, rot: 30, ease: "none" }, { t: 0.5, rot: -30, ease: "none" }, { t: 1, rot: 30, ease: "none" }],
        },
      },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "ground")).toBeUndefined();
  });

  it("doesn't run the ground check on a clip not marked locomotion", () => {
    const def = bipedWithClips([
      { id: "raise", durationMs: 500, loop: false, tracks: { pelvis: [{ t: 0, rot: 0, dx: 0, dy: -300, ease: "none" }, { t: 1, rot: 0, dx: 0, dy: -300, ease: "none" }] } },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "ground")).toBeUndefined();
  });
});

describe("lintRig — L/R symmetry", () => {
  it("flags a declared symmetric pair authored as a duplicate instead of a mirror — the bug this tool exists to catch", () => {
    // Deliberately asymmetric timing (0.4, not 0.5) — see the
    // same-instant-mirror test below for why an exactly half-wave-
    // symmetric curve makes "duplicate" and "genuine half-shifted
    // mirror" numerically indistinguishable (a real degenerate-input
    // limit, not a gap this test should paper over).
    const def = bipedWithClips([
      {
        id: "walk",
        durationMs: 500,
        loop: true,
        symmetricPairs: [["legL", "legR"]],
        tracks: {
          legL: [{ t: 0, rot: -30, ease: "none" }, { t: 0.4, rot: 10, ease: "none" }, { t: 1, rot: -30, ease: "none" }],
          // Same values as legL, not negated — a copy-paste duplicate.
          legR: [{ t: 0, rot: -30, ease: "none" }, { t: 0.4, rot: 10, ease: "none" }, { t: 1, rot: -30, ease: "none" }],
        },
      },
    ]);
    const issues = lintRig(loadRig(def));
    const issue = findIssue(issues, "symmetry");
    expect(issue).toBeDefined();
    expect(issue?.partId).toBe("legL/legR");
  });

  it("doesn't flag a genuine same-instant mirror (negated values)", () => {
    // Deliberately asymmetric timing (0.4, not 0.5) — a curve with EXACT
    // half-wave symmetry makes "negated same-instant" and "un-negated
    // half-cycle-shifted" numerically identical, which is genuinely
    // ambiguous (see the half-cycle-mirror tests below) rather than a
    // gap in the checks; real authored content is never this exact.
    const def = bipedWithClips([
      {
        id: "walk",
        durationMs: 500,
        loop: true,
        symmetricPairs: [["legL", "legR"]],
        tracks: {
          legL: [{ t: 0, rot: -30, ease: "none" }, { t: 0.4, rot: 10, ease: "none" }, { t: 1, rot: -30, ease: "none" }],
          legR: [{ t: 0, rot: 30, ease: "none" }, { t: 0.4, rot: -10, ease: "none" }, { t: 1, rot: 30, ease: "none" }],
        },
      },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "symmetry")).toBeUndefined();
  });

  // legL's keyframe times {0, 0.2, 0.5, 0.7, 1} are closed under a +0.5
  // shift (0<->0.5, 0.2<->0.7, wrapping through 1), so legR's own
  // keyframes can be constructed as an EXACT algebraic shift of legL's
  // — no interpolation-boundary approximation, and (rot values chosen
  // asymmetrically) no accidental half-wave symmetry to confound
  // correlation the way the simple duplicate fixture above would.
  const ASYMMETRIC_LEG_L = [
    { t: 0, rot: 30, ease: "none" },
    { t: 0.2, rot: -10, ease: "none" },
    { t: 0.5, rot: -30, ease: "none" },
    { t: 0.7, rot: 15, ease: "none" },
    { t: 1, rot: 30, ease: "none" },
  ];

  it("doesn't flag a genuine half-cycle-shifted anti-phase mirror — the exact relationship this session's own legionary fix needed", () => {
    // legR(t) = -legL(t - 0.5): a true mirror, just timed a half-cycle
    // later (an alternating gait), not at the same instant. Checking
    // same-instant correlation alone would reject this as "duplicated"
    // (it correlates near +1 at matching t) even though it's a correct
    // mirror once the half-cycle shift is accounted for.
    const legR = [
      { t: 0, rot: 30, ease: "none" }, // -legL(0.5)
      { t: 0.2, rot: -15, ease: "none" }, // -legL(0.7)
      { t: 0.5, rot: -30, ease: "none" }, // -legL(1) = -legL(0)
      { t: 0.7, rot: 10, ease: "none" }, // -legL(0.2)
      { t: 1, rot: 30, ease: "none" },
    ];
    const def = bipedWithClips([{ id: "walk", durationMs: 500, loop: true, symmetricPairs: [["legL", "legR"]], tracks: { legL: ASYMMETRIC_LEG_L, legR } }]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "symmetry")).toBeUndefined();
  });

  it("flags an asymmetric pair phase-shifted but NOT negated — timing was adapted for the gait, mirroring was forgotten", () => {
    // legR(t) = +legL(t - 0.5) — same values as the genuine-mirror case
    // above's timing, but never negated. The author remembered to
    // stagger the gait's timing and forgot the mirror itself.
    const legR = [
      { t: 0, rot: -30, ease: "none" }, // legL(0.5)
      { t: 0.2, rot: 15, ease: "none" }, // legL(0.7)
      { t: 0.5, rot: 30, ease: "none" }, // legL(1) = legL(0)
      { t: 0.7, rot: -10, ease: "none" }, // legL(0.2)
      { t: 1, rot: -30, ease: "none" },
    ];
    const def = bipedWithClips([{ id: "walk", durationMs: 500, loop: true, symmetricPairs: [["legL", "legR"]], tracks: { legL: ASYMMETRIC_LEG_L, legR } }]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "symmetry")).toBeDefined();
  });

  it("flags a pair where one side has no motion at all — nothing to verify a mirror against", () => {
    const def = bipedWithClips([
      {
        id: "walk",
        durationMs: 500,
        loop: true,
        symmetricPairs: [["legL", "legR"]],
        tracks: {
          legL: [{ t: 0, rot: -30, ease: "none" }, { t: 0.5, rot: 30, ease: "none" }, { t: 1, rot: -30, ease: "none" }],
        },
      },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "symmetry")).toBeDefined();
  });

  it("doesn't check pairs no clip declares symmetric", () => {
    const def = bipedWithClips([
      {
        id: "thrust",
        durationMs: 500,
        loop: false,
        tracks: {
          legL: [{ t: 0, rot: 0, ease: "none" }, { t: 1, rot: 40, ease: "none" }],
          legR: [{ t: 0, rot: 0, ease: "none" }, { t: 1, rot: 40, ease: "none" }],
        },
      },
    ]);
    const issues = lintRig(loadRig(def));
    expect(findIssue(issues, "symmetry")).toBeUndefined();
  });
});
