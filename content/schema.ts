import { z } from "zod";

// Single source of truth for content shapes. TS types are inferred with
// z.infer — never hand-write a parallel interface (CLAUDE.md).

export const Beat = z.object({
  id: z.string(),
  year: z.string(), // display: "52 BC"
  sortYear: z.number(), // ordering: -52
  headline: z.string().max(80),
  body: z.string().min(180).max(700),
  visibleLayers: z.array(z.string()),
  camera: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    scale: z.number().default(1),
    durationMs: z.number().default(2600),
    ease: z.string().default("power2.inOut"),
  }),
  fx: z
    .array(
      z.enum(["dust", "smoke", "embers", "rain", "arrow_volley", "fire", "shake", "flash"]),
    )
    .default([]),
  // Gates the post chain's Godray filter (PRD §4: "only when a light source
  // is in frame") — an explicit per-beat author call rather than inferred
  // from fx or lut, because neither reliably implies it: a beat can have
  // 'fire' fx off-frame, or sit under an outdoor-mood lut while framed on
  // an interior with no visible sun.
  lightSource: z.boolean().default(false),
  actors: z
    .array(
      z.object({
        rig: z.string(), // 'legionary' | 'gaul_warrior' | ...
        clip: z.string(), // 'march' | 'brace' | ...
        x: z.number(),
        y: z.number(),
        scale: z.number().default(1),
        count: z.number().default(1), // >1 → instanced crowd
        flip: z.boolean().default(false),
        phase: z.number().default(0), // animation time offset
        // Where this actor sits in the plane depth stack (PRD §3's
        // "character stage" slot sits between mid and near terrain).
        // Defaulted rather than required so no existing beat needs
        // migrating — M6 adds this ahead of any real plane needing it,
        // deliberately (see CLAUDE.md M6 note): cheaper to add now than
        // to retrofit once M8's planes exist to interleave against.
        depth: z.number().min(0).max(1).default(0.6),
      }),
    )
    .default([]),
  audio: z
    .object({
      cue: z.string().optional(),
      bedIntensity: z.number().min(0).max(1).default(0.5),
    })
    // `.default({})` would short-circuit the object's own field defaults —
    // zod fills in a default value as-is, it doesn't re-parse it through
    // the schema. Spelling out bedIntensity here is what actually makes
    // an omitted `audio` key resolve to bedIntensity: 0.5.
    .default({ bedIntensity: 0.5 }),
  sources: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url().optional(),
      }),
    )
    .default([]),
});

export const Region = z.object({
  id: z.string(),
  name: z.string(),
  latinName: z.string(),
  civilisation: z.string(),
  mapCentroid: z.tuple([z.number(), z.number()]),
  heldFrom: z.number(),
  heldTo: z.number().nullable(),
  scene: z.object({
    lut: z.string(), // palette key
    ambientBed: z.string(),
    planes: z.array(
      z.object({
        id: z.string(),
        asset: z.string(),
        depth: z.number().min(0).max(1),
        tint: z.string(), // hex — applied to alpha line art
        blur: z.number().default(0),
      }),
    ),
  }),
  beats: z.array(Beat).min(1).max(10),
});

export type Beat = z.infer<typeof Beat>;
export type Region = z.infer<typeof Region>;

// --- Rig content (M6, cutout puppets) --------------------------------
// content/rigs/{name}.json. A rig is a flat list of parts (joints) plus
// a set of named clips. Playback design (see docs/adr — recorded after
// this milestone): sparse keyframes authored by hand, interpolated with
// a GSAP ease *function* at playback time — not raw per-frame samples
// (too tedious to hand-author) and not a live GSAP Timeline per
// instance (too costly to run 40+ of at 60fps; see engine/scene/puppet).
//
// `rot` on a keyframe is a DELTA in degrees from the part's own `rest`
// rotation, not an absolute angle — so a part with no track in a given
// clip simply stays at rest, and authoring "swing the forearm +40° and
// back" doesn't require knowing what the rest pose's raw angle was.

export const RigKeyframe = z.object({
  t: z.number().min(0).max(1), // normalized position within the clip's duration
  rot: z.number(), // degrees, delta from the part's rest rotation
  // Eases the transition *into* this keyframe from the previous one —
  // a GSAP core ease name (gsap.parseEase), resolved once at rig-load
  // time (engine/scene/puppet/rigLoader.ts), never re-parsed per frame.
  ease: z.string().default("power1.inOut"),
});

export const RigClip = z
  .object({
    id: z.string(), // 'idle' | 'march' | 'brace' | 'thrust' | 'fall' | 'raise' for the v1 legionary, not enforced as an enum — other rigs may need different clips
    durationMs: z.number().positive(),
    loop: z.boolean().default(false),
    // Keyed by part id. A part absent here holds its rest rotation for
    // this clip's whole duration.
    tracks: z.record(z.string(), z.array(RigKeyframe).min(1)),
  })
  .superRefine((clip, ctx) => {
    for (const [partId, keyframes] of Object.entries(clip.tracks)) {
      if (keyframes[0]?.t !== 0) {
        ctx.addIssue({ code: "custom", message: `track "${partId}" must start at t: 0`, path: ["tracks", partId, "0", "t"] });
      }
      if (keyframes[keyframes.length - 1]?.t !== 1) {
        ctx.addIssue({ code: "custom", message: `track "${partId}" must end at t: 1`, path: ["tracks", partId, `${keyframes.length - 1}`, "t"] });
      }
      for (let i = 1; i < keyframes.length; i++) {
        if (keyframes[i].t <= keyframes[i - 1].t) {
          ctx.addIssue({ code: "custom", message: `track "${partId}" keyframes must have strictly increasing t`, path: ["tracks", partId, `${i}`, "t"] });
        }
      }
    }
  });

export const RigPart = z.object({
  id: z.string(),
  // null = the rig's root part (exactly one part must be null — enforced below).
  parent: z.string().nullable(),
  // A procedural placeholder shape key (M6) — becomes a real forged
  // alpha-plane asset path in M7/M8, same asset-reference field either way.
  texture: z.string(),
  // Where this part rotates around, in its OWN local (unrotated) pixel
  // space — Pixi's sprite-pivot convention, e.g. an upper arm's pivot
  // sits at its top-centre (the shoulder) so rotating it swings the
  // whole arm from the shoulder, not from its geometric centre.
  pivot: z.tuple([z.number(), z.number()]),
  // Placeholder shape size in px — real forged art (M7+) will size
  // itself from the source image instead.
  size: z.tuple([z.number(), z.number()]),
  // Static draw order across the WHOLE rig, independent of the parent
  // chain above — a back leg needs to draw behind the torso and a front
  // leg in front of it even though both are the torso's children for
  // TRANSFORM purposes (rotating the torso must still carry both legs).
  // See engine/scene/puppet/jointSolver.ts's header for why transform
  // hierarchy and draw order are deliberately solved separately.
  zOrder: z.number().int(),
  rest: z.object({
    // Position of `pivot` within the PARENT's local space (world space
    // for the root part), at the clip-neutral rest pose.
    x: z.number(),
    y: z.number(),
    rotation: z.number().default(0), // degrees; clip keyframes add a delta on top of this
    scale: z.number().default(1),
  }),
});

export const Rig = z
  .object({
    id: z.string(),
    parts: z.array(RigPart).min(1),
    clips: z.array(RigClip).min(1),
  })
  .superRefine((rig, ctx) => {
    const ids = new Set<string>();
    for (const part of rig.parts) {
      if (ids.has(part.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate part id "${part.id}"`, path: ["parts"] });
      }
      ids.add(part.id);
    }

    const roots = rig.parts.filter((part) => part.parent === null);
    if (roots.length !== 1) {
      ctx.addIssue({ code: "custom", message: `rig must have exactly one root part (parent: null), found ${roots.length}`, path: ["parts"] });
    }

    for (const part of rig.parts) {
      if (part.parent !== null && !ids.has(part.parent)) {
        ctx.addIssue({ code: "custom", message: `part "${part.id}"'s parent "${part.parent}" does not exist`, path: ["parts"] });
      }
    }

    // Cycle check: walk each part's ancestor chain; a well-formed tree
    // reaches a root (parent: null) in at most `parts.length` hops.
    const byId = new Map(rig.parts.map((part) => [part.id, part]));
    for (const part of rig.parts) {
      let current: typeof part | undefined = part;
      let hops = 0;
      while (current && current.parent !== null) {
        current = byId.get(current.parent);
        hops += 1;
        if (hops > rig.parts.length) {
          ctx.addIssue({ code: "custom", message: `part "${part.id}" has a cyclical ancestor chain`, path: ["parts"] });
          break;
        }
      }
    }

    const clipIds = new Set<string>();
    for (const clip of rig.clips) {
      if (clipIds.has(clip.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate clip id "${clip.id}"`, path: ["clips"] });
      }
      clipIds.add(clip.id);
      for (const partId of Object.keys(clip.tracks)) {
        if (!ids.has(partId)) {
          ctx.addIssue({ code: "custom", message: `clip "${clip.id}" tracks unknown part "${partId}"`, path: ["clips", clip.id, "tracks", partId] });
        }
      }
    }
  });

export type RigKeyframe = z.infer<typeof RigKeyframe>;
export type RigClip = z.infer<typeof RigClip>;
export type RigPart = z.infer<typeof RigPart>;
export type Rig = z.infer<typeof Rig>;

// --- Question content -----------------------------------------------
// PRD §7 gives the DB `question` table shape but not a content-authoring
// schema; this mirrors that table shape for content/questions/*.json,
// which M9 will seed into the DB.

export const QuestionOption = z.object({
  id: z.string(),
  text: z.string(),
});

export const Question = z
  .object({
    id: z.string(),
    regionId: z.string(),
    era: z.string(),
    difficulty: z.number().int().min(1).max(3),
    prompt: z.string(),
    options: z.array(QuestionOption).min(2),
    correctOptionId: z.string(),
    explanation: z.string(),
    rightQuip: z.string(),
    // Keyed by option id, not one string per question — a joke about the
    // *specific* wrong answer someone picked is the point (PRD §7).
    wrongQuips: z.record(z.string(), z.string()),
    sources: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url().optional(),
        }),
      )
      .default([]),
  })
  .superRefine((question, ctx) => {
    const optionIds = new Set(question.options.map((option) => option.id));

    if (!optionIds.has(question.correctOptionId)) {
      ctx.addIssue({
        code: "custom",
        message: `correctOptionId "${question.correctOptionId}" is not one of the option ids`,
        path: ["correctOptionId"],
      });
    }

    for (const key of Object.keys(question.wrongQuips)) {
      if (!optionIds.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: `wrongQuips key "${key}" is not one of the option ids`,
          path: ["wrongQuips", key],
        });
      }
    }

    for (const id of optionIds) {
      if (id !== question.correctOptionId && !(id in question.wrongQuips)) {
        ctx.addIssue({
          code: "custom",
          message: `missing wrongQuips entry for wrong option "${id}"`,
          path: ["wrongQuips", id],
        });
      }
    }
  });

export type QuestionOption = z.infer<typeof QuestionOption>;
export type Question = z.infer<typeof Question>;

// --- Atlas content ----------------------------------------------------
// Province boundaries, city markers and sea labels for engine/atlas.
// Geometry is stored as lon/lat GeoJSON (WGS84) — engine/atlas/projection.ts
// is the only place that turns it into SVG paths, and it does that for
// every layer alike, hand-authored provinces included (see ADR 002: the
// provinces round-trip through real lon/lat so the same projection code
// exercises them, rather than the hand art skipping the pipeline).

export const GeoPosition = z.tuple([z.number(), z.number()]); // [lon, lat]

// Minimal GeoJSON geometry shapes — only what the atlas needs, not the
// full spec (no GeometryCollection, no bbox, no CRS member).
const LinearRing = z.array(GeoPosition).min(4); // closed: first === last

export const PolygonGeometry = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(LinearRing).min(1),
});

export const MultiPolygonGeometry = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(LinearRing).min(1)).min(1),
});

export const ProvinceGeometry = z.union([PolygonGeometry, MultiPolygonGeometry]);

export const Province = z
  .object({
    id: z.string(),
    name: z.string(),
    latinName: z.string(),
    heldFrom: z.number(),
    heldTo: z.number().nullable(),
    geometry: ProvinceGeometry,
    // Where the map draws the province's name label — not always the same
    // as the geometric centroid, which can fall outside an irregular or
    // crescent-shaped province.
    labelCentroid: GeoPosition,
  })
  .superRefine((province, ctx) => {
    if (province.heldTo !== null && province.heldTo < province.heldFrom) {
      ctx.addIssue({
        code: "custom",
        message: `heldTo (${province.heldTo}) is before heldFrom (${province.heldFrom})`,
        path: ["heldTo"],
      });
    }
  });

export type GeoPosition = z.infer<typeof GeoPosition>;
export type PolygonGeometry = z.infer<typeof PolygonGeometry>;
export type MultiPolygonGeometry = z.infer<typeof MultiPolygonGeometry>;
export type ProvinceGeometry = z.infer<typeof ProvinceGeometry>;
export type Province = z.infer<typeof Province>;

export const City = z.object({
  id: z.string(),
  name: z.string(),
  latinName: z.string(),
  position: GeoPosition,
});

export const SeaLabel = z.object({
  id: z.string(),
  text: z.string(), // e.g. "MARE INTERNVM" — set in Roman-inscriptional caps
  position: GeoPosition,
  rotation: z.number().default(0), // degrees, for lettering that follows a coastline
});

export type City = z.infer<typeof City>;
export type SeaLabel = z.infer<typeof SeaLabel>;
