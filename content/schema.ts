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
