# Imperium — Product Requirements Document

**Working title:** Imperium (product) · "History Made Cool" (internal)
**Owner:** Jivesh Nazar
**Version:** 1.2 — painted parallax revision
**Status:** Pre-build. This document is the build spec.

> **Changes from v1.1:** Art direction changed from animated engraving back to **painted parallax** (§3) — primary sources are full-colour academic history paintings (Gérôme, Alma-Tadema, Poynter, Bierstadt), not monochrome etchings. The per-scene LUT (§4), not colour-stripping at the asset level, now does the cross-source consistency work. Engravings demote to reference/fallback for architectural detail and figure poses, and stay the source for cutout character parts, where alpha-from-luminance still applies. Blender documented as a post-M8 escape hatch (§3.6) if painted planes read flat, not adopted.
>
> **Changes from v1.0:** Rive removed (its free plan cannot export runtime files). Characters are now cutout puppet rigs driven by GSAP. `flubber` replaced by GSAP MorphSVG, now free. Every dependency in this document costs nothing.

---

## 1. What this is

An interactive historical atlas. Click a region on a period map, drop through a cloud transition into an animated cinematic scene that tells you what happened there, then get tested on whether you were paying attention.

Rome first. The engine is built so every civilisation after it costs writing and art, not code.

**Thesis:** history is boring on the page and expensive on screen. This makes it cheap on screen.

### Why this can work

Everything in this space is one of three things: a static map with a text panel, a documentary you passively watch, or a strategy game where history is a skin over mechanics. Nobody has built the middle thing — a short, dense, visually serious explainer you *navigate*. The format is proven (Kurzgesagt, Extra History, Oversimplified all clear millions of views). Nobody has made it interactive.

### Non-goals

- Not a strategy game. No resource management, no simulation, no "what if."
- Not a course platform. No lesson plans, no certificates in v1.
- Not comprehensive. Twelve excellent regions beat sixty thin ones.
- Not a wiki. If someone wants dates and lists, Wikipedia already won.

### Audience

1. **16–30, already curious about history.** Watches this content on YouTube, would rather click than watch. Primary.
2. **Students, 14–18.** Using it because it beats the textbook. Drives quiz usage.
3. **Teachers.** Low volume, high leverage — they share things that look credible.

---

## 2. Core loop

```
Atlas (period map)
  → click region
  → cloud transition
  → Scene: 4–8 animated beats, narrated
  → end card
  → Quiz: 5 questions, funny feedback either way
  → XP, rank, region marked complete
  → back to Atlas
```

Session target: 8–14 minutes. One region and its quiz.

---

## 3. Art direction: painted parallax

### The decision

Photorealistic AC-style scenes need commissioned art. There is no budget. The alternative is not "worse realistic" — it's public-domain 19th-century academic history painting, and at identical effort it lands materially closer to the reference look than a monochrome style would.

The original decision (v1.0–1.1) was animated engraving — everything as etched line art, alpha-from-luminance, tinted at runtime. That choice existed to solve one problem: mixing sources without it looking like a ransom note. Monochrome-with-alpha unifies free-for-nothing, because the palette lives in code, not in the file.

But the post chain (§4) already carries a per-scene LUT via `ColorMatrixFilter`, applied to the whole stage — and that LUT unifies full-colour planes exactly as well as it unified monochrome ones. Once the consistency problem is solved in code, the monochrome constraint isn't buying anything anymore. It was only ever costing realism.

**Primary sources are academic history paintings, kept in full colour.** Photorealistic, archaeologically researched, dramatically lit, public domain in high resolution. Same plane-separation workflow, same Pixi pipeline, same effort — closer to the target look.

### Where the art comes from

| Source | What's there |
|---|---|
| **Gérôme** (d. 1904) | Archaeologically obsessive figure and interior scenes — arenas, temples, market scenes, dramatic single-point lighting. |
| **Alma-Tadema** (d. 1912) | Marble, light, and crowd staging — the best public-domain reference for Roman civic space. |
| **Poynter** | Figure composition and costume detail; usable directly. |
| **Bierstadt** | Landscape and atmosphere — skies, distance, weather, for scenes painting doesn't otherwise cover. |
| Rijksmuseum · Met Open Access · Getty Open Content · Wikimedia Commons | High-res CC0 / PD downloads of the above and more. |

**Engravings (Piranesi, Cichorius) demote from primary source to reference and fallback.** Still useful — architectural detail and figure poses where no painting exists — but no longer where the plane art comes from by default.

**Verify the rights status of every individual asset before use.** "The artist died in 1904" and "this specific scan is CC0" are separate questions. Record the source URL and licence for each file in `content/assets/manifest.json`. Non-negotiable — this is the thing that could kill the project later.

### Colour and consistency: the LUT does the unifying work now

Backdrop planes keep their colour. No desaturation, no levels pass, no luminance-to-alpha conversion:

1. Source the painting at the highest resolution available.
2. Plane-separate as before (below).
3. Export each plane as WebP, colour intact.
4. Consistency across sources — a Gérôme interior next to a Bierstadt sky — comes from the per-scene LUT applied in Pixi via `ColorMatrixFilter`, not from stripping colour at the asset level.

Scene mood is still a single variable — the LUT — same as under the engraving approach. The asset itself now carries more information into the frame instead of less.

**Alpha-from-luminance is not gone — it's scoped down to where it earns its keep:** cutout character parts and foreground silhouettes, where a clean matte matters more than colour fidelity. Engraved figures still work well here precisely because ink-on-paper gives a near-binary luminance split that mattes cleanly; a painted figure doesn't, so cutout puppet source material still leans on engravings and high-contrast figure studies (§ Characters, below), independent of what backdrop planes use.

Colour planes don't compress as tightly as monochrome-with-alpha WebP did — expect scene asset payload to run higher per plane than the old ~200KB assumption. Re-check the per-region budget (§11) once the first painted scene (M8, Gallia) is built.

**Tools, all free:** [Photopea](https://photopea.com) (browser, Photoshop-like, no install), GIMP, or Krita.

### Plane separation

Per scene, 5–8 planes, unchanged:

```
sky · far architecture · mid architecture · mid terrain
  · character stage · near terrain · foreground silhouette
```

Lasso the foreground elements, cut to their own layer, clone-stamp the hole behind them, repeat inward. ~4 hours per scene by hand; the M7 script cuts it to ~2.

### Characters: cutout puppets

Cut a figure from an engraving — a Cichorius plate, or a high-contrast figure study where no engraving exists. Separate it at the joints — head, torso, upper arm, forearm, thigh, shin, foot. Reassemble in a Pixi container with correct pivots. Animate by rotating the parts with GSAP.

This is how cutout animation has always worked. It's free, needs no new tool, and profile-view engraved figures are *ideal* source material because they were carved in profile in the first place, and their ink/paper contrast alpha-mattes cleanly (see above) in a way a painted figure won't.

**Rig library for v1:** `legionary`, `auxiliary`, `cavalry`, `standard_bearer`, `gaul_warrior`, `civilian`.
**Clips per rig:** `idle`, `march`, `brace`, `thrust`, `fall`, `raise`.

Distant crowds are never individual rigs — instanced quads on a shared 4-frame march texture. Thousands of units at negligible cost.

### 3.6 — Escape hatch: Blender, if M8 falls short

Documented, not adopted. Revisit only after M8 ships Gallia with painted planes — if the result still looks flat once the grade, camera drift, and particles are in, this is the free path to more realism:

- **Blender** (free) rendering out to layered PNGs with alpha — feeds the existing Pixi pipeline with zero code change. Planes stay planes; only how they're made changes.
- **Poly Haven** and **ambientCG** for CC0 HDRIs, PBR textures, and models. HDRI lighting is most of the realism gain — more than modelling quality.
- **Mixamo** for auto-rigging and motion-capture animation cycles, rendered to sprite sheets. Verified free with an Adobe account, royalty-free for unlimited commercial use; the only restriction is no redistributing the raw files as asset packs. Unmaintained since Adobe's 2015 acquisition and it has had multi-day outages — download and keep local copies rather than depending on live availability.

**Cost:** 2–3 weeks learning Blender, then 10–14h art per scene instead of 5h. Roughly +60–100h across the twelve launch regions.

**Risk to record:** stylised art has a high floor — worst case, it's not to taste. Attempted realism has a low floor — amateur 3D reads as amateur instantly, and reads as amateur *faster* than amateur painting does. Do not adopt speculatively.

**Decision point:** after M8. If adopted, prefer it surgically — characters only — over rebuilding backdrops. Painted backdrop planes and 3D-rendered character planes can sit in the same parallax stack; the plane model doesn't care how a plane was made.

---

## 4. What actually makes it feel expensive

Break down why a cinematic reads as high-budget and only one of five ingredients is art:

| Ingredient | Contribution | Cost |
|---|---|---|
| Colour grade — one unified LUT over the frame | very high | zero |
| Camera micro-motion — slow push plus handheld drift | very high | zero |
| Atmosphere — dust, haze, embers, light shafts | high | low |
| Depth — 6–9 parallax planes, not 3 | high | low |
| Character art | medium | your time |

**Four of five are code.** Build those first. Placeholder art with a proper grade, camera and particles looks better than good art without them.

**Post chain** (`pixi-filters`), applied to the whole stage:

```
ColorMatrixFilter   per-scene LUT
  → AdvancedBloom   fire, sun, metal
  → Godray          only with a light source in frame
  → Noise           film grain, ~0.06
  → RGBSplit        chromatic aberration, ~0.5px, edges only
  → Vignette
```

**Camera** — a GSAP timeline on the root container's `x`, `y`, `scale`, `rotation`. Every beat gets a slow push or drift; never a static hold. On top of that, permanent handheld noise: 1D Perlin sampled at ~0.4Hz, 3–6px translation, 0.2° rotation. This single detail does more for perceived quality than any asset.

---

## 5. Tech stack

Every item is free. Where I recommend against something you already know, the reason is stated.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16, App Router, TypeScript** | RSC genuinely helps: content and quiz render server-side, only the scene player ships as client JS. |
| Atlas | **SVG + `d3-geo` + GSAP MorphSVG** | Crisp clickable vectors and border morphing. MorphSVG is free now, so no `flubber` dependency. |
| Scenes | **PixiJS v8** | WebGL. Thousands of sprites, real filter chains, 60fps mobile. SVG has a hard ceiling here. |
| Characters | **Cutout puppets — Pixi containers + GSAP** | Free. Rive's free tier can't export runtime files. |
| Timeline | **GSAP** (free, all plugins) | Beat orchestration with seek, scrub and reverse for free. |
| Audio | **Howler.js** | Layered ambient beds with crossfade, sprite maps. Tone.js is overkill. |
| Auth | **Better Auth** + Drizzle adapter | TS-native, self-hosted, you own the user table. Email/password + Google. |
| Database | **Postgres on Neon** free tier | Serverless, branches per PR. |
| ORM | **Drizzle** | Over Prisma despite your familiarity: far smaller serverless cold start, SQL-shaped API suits the quiz analytics. Prisma is acceptable if velocity wins. |
| Content | **JSON in-repo, Zod-validated** | Version-controlled content, CI-enforced schema. Authoring UI comes in v2. |
| Assets | **Cloudflare R2** free tier (10GB, no egress) | Scene art is heavy — full-colour painted planes more so than the monochrome-alpha planes originally budgeted (§3) — and S3 egress would hurt. Still comfortably inside 10GB at 12-region launch scale. |
| Hosting | **Vercel Hobby** | Free. ⚠️ Hobby is **non-commercial only** — the day you charge for anything, you need Pro. |
| Analytics | **PostHog** free tier | Per-beat drop-off is the most valuable number you'll have. |
| Errors | **Sentry** free tier | WebGL fails in device-specific ways. |
| Fonts | **Cinzel + EB Garamond** (Google Fonts, OFL) | Cinzel is based on Roman inscriptional capitals. Correct, and free. |
| Audio assets | **Freesound** (filter CC0) · **Musopen** · **Pixabay Audio** | Attribution required for CC-BY. Log it in the manifest. |
| Testing | **Vitest** + **Playwright** | Content schema validation is a CI gate. |

**Not using:** Three.js (3D asset cost prohibitive solo), Rive/Spine (both cost money to ship), Redux (Zustand covers it), any paid CMS.

---

## 6. Architecture

```
imperium/
├─ app/
│  ├─ (marketing)/page.tsx
│  ├─ atlas/page.tsx
│  ├─ scene/[regionId]/page.tsx
│  ├─ quiz/[regionId]/page.tsx
│  ├─ profile/page.tsx
│  └─ api/
│     ├─ auth/[...all]/route.ts
│     ├─ progress/route.ts
│     └─ quiz/{session,answer}/route.ts
├─ engine/
│  ├─ scene/
│  │  ├─ SceneRenderer.ts       Pixi lifecycle, layer mount
│  │  ├─ Camera.ts              GSAP timeline + Perlin handheld
│  │  ├─ BeatDirector.ts        beat JSON → timeline
│  │  ├─ layers/                ParallaxPlane, CrowdField, PuppetActor
│  │  ├─ puppet/                rig loader, clip player, joint solver
│  │  ├─ particles/             emitter configs
│  │  └─ post/                  filter chain + LUTs
│  ├─ atlas/
│  │  ├─ projection.ts          d3-geo GeoJSON → SVG paths
│  │  ├─ MorphBorders.ts        MorphSVG era interpolation
│  │  └─ AtlasMap.tsx
│  ├─ transition/
│  │  ├─ CloudSweep.tsx         atlas<->scene sweep — CSS/SVG, not WebGL (ADR 004)
│  │  ├─ transitionStore.ts     zustand — cross-tree sweep trigger
│  │  └─ sweepTween.ts          dependency-free rAF tween driver
│  └─ audio/AudioDirector.ts
├─ content/
│  ├─ regions/{id}.json
│  ├─ questions/{id}.json
│  ├─ borders/{year}.geojson
│  ├─ rigs/{name}.json
│  ├─ assets/manifest.json      source URL + licence per file
│  └─ schema.ts                 Zod
├─ tools/
│  └─ forge/                    CLI: source scan → scene plane (colour, or alpha for engravings/character parts)
├─ db/schema.ts
├─ lib/                         auth.ts, auth-client.ts, env.ts — server/client glue, not engine or content
└─ CLAUDE.md
```

**Hard rule:** `engine/` never imports from `content/`. Content is passed in. This is what makes civilisation #2 cost zero engine work.

---

## 7. Data models

### Content (Zod, `content/schema.ts`)

```ts
const Beat = z.object({
  id: z.string(),
  year: z.string(),                 // display: "52 BC"
  sortYear: z.number(),             // ordering: -52
  headline: z.string().max(80),
  body: z.string().min(180).max(700),
  visibleLayers: z.array(z.string()),
  camera: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    scale: z.number().default(1),
    durationMs: z.number().default(2600),
    ease: z.string().default('power2.inOut'),
  }),
  fx: z.array(z.enum([
    'dust','smoke','embers','rain','arrow_volley','fire','shake','flash'
  ])).default([]),
  actors: z.array(z.object({
    rig: z.string(),                // 'legionary' | 'gaul_warrior' | ...
    clip: z.string(),               // 'march' | 'brace' | ...
    x: z.number(), y: z.number(),
    scale: z.number().default(1),
    count: z.number().default(1),   // >1 → instanced crowd
    flip: z.boolean().default(false),
    phase: z.number().default(0),   // animation time offset
  })).default([]),
  audio: z.object({
    cue: z.string().optional(),
    bedIntensity: z.number().min(0).max(1).default(0.5),
  }).default({}),
  sources: z.array(z.object({
    label: z.string(),
    url: z.string().url().optional(),
  })).default([]),
});

const Region = z.object({
  id: z.string(),
  name: z.string(),
  latinName: z.string(),
  civilisation: z.string(),
  mapCentroid: z.tuple([z.number(), z.number()]),
  heldFrom: z.number(),
  heldTo: z.number().nullable(),
  scene: z.object({
    lut: z.string(),                 // palette key
    ambientBed: z.string(),
    planes: z.array(z.object({
      id: z.string(),
      asset: z.string(),
      depth: z.number().min(0).max(1),
      tint: z.string(),              // hex — applied via ColorMatrixFilter; alpha planes only (characters, silhouettes), colour backdrop planes use the scene-level lut instead
      blur: z.number().default(0),
    })),
  }),
  beats: z.array(Beat).min(1).max(10),
});
```

### Database (Drizzle)

```
user / session / account                              [Better Auth]

profile         userId PK, displayName, xp, rank, streakDays,
                lastActiveDate, prefersReducedMotion, createdAt

regionProgress  id, userId, regionId, beatsViewed jsonb,
                completedAt, lastViewedAt        UNIQUE(userId, regionId)

question        id, regionId, era, difficulty(1-3), prompt,
                options jsonb, correctOptionId, explanation,
                rightQuip, wrongQuips jsonb, sources jsonb

quizSession     id, userId, regionId, mode, score, total,
                startedAt, finishedAt
quizAnswer      id, sessionId, questionId, chosenOptionId,
                correct, timeMs, createdAt
```

**`wrongQuips` is keyed by option ID, not one string per question.** A joke about the *specific* wrong answer someone picked is funny; a generic "nope!" is not. This is the difference between a feature people talk about and a feature people skip.

---

## 8. Feature specs

### 8.1 Atlas

- Framed period map: ornate double border, corner rules, title cartouche with aquila.
- Three inset mini-maps in the corners *are* the era switcher. Click an inset, it swaps with the main map. The control and the reference are the same object — no extra UI.
- Held regions fill vermilion; labels fade in. Hover raises opacity and shows a one-line teaser.
- Borders morph between eras via MorphSVG over ~900ms. Lost regions fade out, gained regions fade in.
- Completed regions carry a small gold wreath mark.
- **Real GeoJSON, not hand-drawn paths.** Candidates: `aourednik/historical-basemaps` (GitHub), Digital Atlas of the Roman Empire (Lund), Pleiades for place coordinates. **Verify licences before M1.**

### 8.2 Cloud transition

Clash-of-Clans style. Two cloud masses sweep in from left and right, meet, hold ~250ms while the route swaps, then part. Total ~2.0s.

**CSS/SVG, not WebGL** (M3; see ADR 004). Each mass is a translated `<div>` with a static `feTurbulence`+`feDisplacementMap` filter for the noise-displaced organic edge — the same technique `AtlasFilters.tsx`'s `inkEdges` already uses — plus 12–16 drifting puff sprites (plain gradient circles, no filter) at varied depth and speed for parallax. All motion is `transform`/`opacity` only, driven by a dependency-free `requestAnimationFrame` tween, not GSAP: this overlay has to be ready on the very first click, with none of border-morphing's idle-prefetch grace period, so it ships eager rather than risk a cold dynamic import racing a click. WebGL was the original plan but would mean standing up a third render pipeline (atlas is SVG, scenes are Pixi) purely for a ~2-second overlay, paying real context-creation latency on the product's single most latency-sensitive interaction, for a shape that's fundamentally a 2D masked silhouette. This runs on every atlas↔scene transition and is the most-seen animation in the product. It deserves real polish.

### 8.3 Scene player

- Letterboxed. Caption block bottom-centre: year eyebrow, headline, body.
- `‹` `›`, pip indicators, autoplay toggle. Arrow keys and Escape bound.
- Autoplay dwell = `max(7s, wordCount / 3.2 + 2.5s)`. Never a fixed interval — long beats get cut off.
- Pointer parallax on all planes; off under `prefers-reduced-motion`.
- **Sources drawer** per beat. Costs nothing, buys enormous credibility with the audience most likely to pick you apart.
- End card: "Test yourself on {Region}" / "Return to the map."
- Progress POSTs per beat (debounced) so refresh resumes.

### 8.4 Auth

- Email/password + Google. No mandatory verification in v1 — it kills activation.
- **Atlas and every scene are fully open without an account.** Login gates only progress, XP, rank and quiz history. Gating a discovery-driven product kills it before anyone shares it.
- Prompt signup after the first completed quiz, when there's something to lose.
- Anonymous progress in `localStorage`, migrated on signup.

### 8.5 Quiz

**Format.** 5 questions per region. 4 options. Immediate feedback. No timer in v1 — timers punish reading, and reading is the point.

**Grading is server-side.** `POST /api/quiz/session` returns questions with `correctOptionId` stripped. `POST /api/quiz/answer` grades and returns verdict, explanation and quip. The client never holds the answer key.

**Feedback voice — this is a spec, not a vibe.** Get it wrong and the feature turns mean.

- The joke punches at *history* or at *the wrong answer*. **Never at the user.**
- Dry over zany. No exclamation spam, no emoji, no "Oof!" / "Yikes!" / "Bruh."
- **Every quip still teaches.** The correct fact lives inside the joke, so a wrong answer is never a wasted turn.
- One to two sentences, under 30 words. Longer isn't funnier.
- Correct answers get humour too. Being right should feel good, not like a bare green tick.

Worked examples:

> **Q.** How long did Caesar's conquest of Gaul take?
> A) 8 years ✓ · B) 20 years · C) 3 years · D) 40 years
>
> ✓ **A** — "Eight years. He also wrote the only surviving detailed account himself, in the third person, so we have his word for basically all of it."
> ✗ **B** — "Twenty years, and he'd have been filing expenses the whole time. Eight. It took eight."
> ✗ **C** — "Three years is roughly how long the Nervii alone took to stop being a problem. Eight."
> ✗ **D** — "Forty years is an entire senatorial career. Caesar did it in eight and still had time for a civil war."

> **Q.** Why did Caesar build a *second* wall at Alesia?
> ✓ — "Correct. A relief army was coming, so he built twenty-one more kilometres facing outward. His army was besieging and besieged at once, which remains an extremely strange sentence."
> ✗ *(option: "to hold cavalry")* — "The cavalry were fine. The second wall faced outward, because a quarter of a million Gauls were on their way to hit him from behind."

**Progression.** XP per correct answer, scaled by difficulty. Ranks are thematic and free: *Tiro → Miles → Immunis → Optio → Centurio → Primus Pilus → Legatus*. Daily streak. No leaderboards in v1 — they invite gaming and add moderation load.

---

## 9. Content production — the actual bottleneck

Engineering is ~7 weeks of evenings. Content never ends. Plan around it.

**Per region:** 4h research and drafting · 2h fact-check · 5h art (sourcing paintings, plane separation, colour export) · 2h scene composition and camera · 2h quiz writing with per-option quips · 1h audio. **≈16 hours.**

The painted workflow doesn't move this estimate. Sourcing a painting instead of an engraving is the same search-and-license effort; plane separation is the same lasso-and-clone-stamp workflow either way; the only step that changes is the export pass, which gets *simpler* (skip desaturate/level/luminance-to-alpha, export straight to WebP). Still ~5h.

Twelve regions for a credible launch ≈ **190 hours**. That is the real schedule. Everything else is a rounding error.

**Gates before a region ships:**
1. Every factual claim traceable to a source. Wikipedia may be the route to a source; it is not the source.
2. Disputed numbers flagged as disputed in the copy. Ancient troop figures are propaganda — say so.
3. A second pair of eyes on the history. A history postgrad reviewing for credit is the cheapest credibility you will ever buy.
4. Every asset's source URL and licence recorded in `content/assets/manifest.json`.
5. Read the copy aloud. If it sounds like an encyclopaedia, rewrite it.

**Launch set (12):** Gallia, Britannia, Italia, Aegyptus, Judaea, Dacia, Hispania, Africa, Asia, Syria, Graecia, Germania.

Gallia/Alesia is the flagship. Build it to the ceiling and make it the bar everything else must clear.

---

## 10. Build plan

One milestone per Claude Code session. Do not start a milestone until the previous acceptance criteria pass.

**M0 — Foundation** *(~1 day)*
Next.js 15 + TS + Drizzle + Neon + Better Auth. Email/password and Google. Protected `/profile`. Vitest + Playwright. CI runs typecheck, lint, test.
✅ Sign up, log in, log out, session survives refresh. CI green on a PR.

**M1 — Atlas** *(~3 days)*
Historical GeoJSON → `d3-geo` → SVG paths. Four eras. Inset switcher with swap. Parchment filters, ornate frame, cartouche, city and sea labels. Region hover and click.
✅ All four eras render; inset click swaps with main; region click routes to `/scene/[id]`.

**M2 — Border morphing** *(~2 days)*
GSAP MorphSVG between era boundary sets. Gained regions fade in, lost fade out.
✅ Era switch animates over ~900ms with no path popping or self-intersection.

**M3 — Cloud transition** *(~2 days)*
CSS/SVG cloud sweep (§8.2, ADR 004), noise-displaced alpha, parallax puffs, route swap at full occlusion. Reusable both directions.
✅ 60fps on mid-range Android. No white flash. No layout shift either side.

**M4 — Scene engine core** *(~5 days)*
Pixi v8 lifecycle. `ParallaxPlane` with depth-based pointer offset and runtime tint. `Camera` with GSAP timeline plus Perlin handheld. `BeatDirector` consuming beat JSON. Letterbox, captions, controls, keyboard.
✅ A region JSON with placeholder planes plays all beats with correct camera and caption timing.

**M5 — Post-processing and particles** *(~4 days)*
Full filter chain with per-scene LUTs. Emitters: dust, smoke, embers, arrow volleys, fire. Screen shake. Device-tier degradation.
✅ Side-by-side with and without the chain shows an obvious quality gap. Frame time under 16ms on mid-range mobile.

**M6 — Cutout puppets** *(~4 days)*
Rig format (`content/rigs/*.json`): parts, pivots, z-order, clips as keyframed rotations. `PuppetActor` renders a rig; `CrowdField` does instanced quads for distant units. One `legionary` rig with all six clips.
✅ 40 legionaries with staggered phase offsets plus a 500-unit distant crowd, holding 60fps.

**M7 — Asset forge** *(~2 days)*
`tools/forge` CLI: resize → colour-correct → WebP for painted planes; batch desaturate → level → luminance-to-alpha → resize → WebP for engraving/character sources; plus manifest entry stubs. `npm run forge -- ./raw/gerome-01.jpg` (colour plane) or `npm run forge -- ./raw/cichorius-01.jpg --alpha --tint mid` (character source).
✅ A raw painting scan becomes a game-ready colour plane, and a raw engraving scan a game-ready alpha plane, each in one command, manifest row generated.

**M8 — Gallia to the ceiling** *(~6 days)*
Six beats, real painted planes, puppet actors, full audio, all effects. The reference implementation.
✅ Someone who has never seen the project watches end to end without touching their phone.

**M9 — Quiz** *(~3 days)*
Question bank schema and seeding. Server-side grading. Per-option quip UI. XP, rank, streaks. Anonymous → account progress migration.
✅ Answer key never appears in any network response before submission. Verified in Playwright.

**M10 — Audio** *(~2 days)*
Howler ambient beds with crossfade between beats. Per-beat cues. Master mute, persisted. Audio starts on first user gesture, never before.
✅ No autoplay console errors. Mute survives navigation.

**M11 — Shell and launch** *(~3 days)*
Landing, profile, OG images, sitemap, PostHog, Sentry, mobile pass, `prefers-reduced-motion` throughout, full keyboard nav.
✅ Lighthouse ≥90 performance and accessibility on non-scene routes. Full flow works on mid-range Android.

---

## 11. Performance budgets

Enforced in CI. WebGL products die on mobile.

| Metric | Budget |
|---|---|
| Atlas TTI | < 2.0s on 4G |
| Scene first beat interactive | < 3.0s |
| Scene frame time | < 16ms on Pixel 6a class |
| Scene asset payload | < 2.5MB per region (painted colour planes; re-verify after M8 — heavier than the alpha-line-art estimate this budget was originally set against) |
| Atlas route JS | < 180KB gzipped |

Low-end detection degrades to 4 planes, halved particles, no godrays or chromatic aberration. **Never ship a stuttering scene** — a stuttering cinematic is worse than a static image.

---

## 12. Accessibility

- `prefers-reduced-motion`: parallax off, camera moves become cuts, minimal particles, cloud transition becomes a 200ms fade. Content stays fully available.
- Every beat's text is real DOM, not baked into canvas. Screen readers get the full narrative.
- Full keyboard nav: focusable atlas regions, arrow keys drive beats, Escape exits.
- Captions meet 4.5:1 against the letterbox, not against the scene.
- A "Read as text" toggle rendering the campaign as an article. Some people want to read. Let them, and take the SEO.

---

## 13. Content standards

- **Violence:** implied, not depicted. Silhouettes, dust, smoke, sound. No gore. Keeps it classroom-usable and it's better filmmaking anyway.
- **Contested history:** where scholarship genuinely divides, say so rather than silently picking a side.
- **Ancient numbers:** cite as claims, attributed. Caesar *said* a quarter of a million; that is not the same as there having been one.
- **Atrocity:** don't sanitise, don't wallow. Rome enslaved on an industrial scale. Say it plainly, once, move on.
- **The quiz never mocks the user.** See §8.5.

---

## 14. Metrics

| Metric | Definition | Target |
|---|---|---|
| Scene completion | reach the final beat | > 55% |
| Beat drop-off | which beat loses people | no beat > 15% |
| Quiz attach | completers who start the quiz | > 35% |
| Second region | open another same session | > 40% |
| D7 return | signed-up users back within a week | > 20% |

Beat-level drop-off is the most valuable number you will have. It names the boring beat, and boring beats are fixable in an afternoon.

---

## 15. Scale plan

**v1 — Rome (months 1–3).** 12 regions, quiz, accounts. Prove the format.

**v2 — Generalisation (months 4–6).** Second civilisation, chosen to stress the engine differently: **the Mongol expansion** over Feudal Japan, because the map animates as a moving front rather than static provinces, forcing the border system to become genuinely general. Add the `/studio` authoring tool — hand-writing JSON stops scaling around region 30. Note the art sourcing shifts: Persian and Chinese manuscript illustration and 19th-century orientalist/academic painting of the region, much of it PD, same painted-plane pipeline (§3) — colour kept, consistency from the per-scene LUT.

**v3 — Platform (months 7–12).**
- **Timelines** as well as maps — vertical scroll through a century, scenes triggering at scroll positions.
- **Connections** between regions. "This grain fleet feeds *that* city." Turns a set of stories into a world.
- **Classroom mode.** Teacher creates a class, assigns regions, sees results. This is where the revenue is and it needs almost no engine work.
- **Community campaigns.** Open the beat schema and the studio. Highest ceiling, highest moderation cost. Only once the core is undeniably good.

**Monetisation, when earned.** Free: full atlas, 3 regions per civilisation, unlimited quizzes. Personal ~₹250/mo: everything, offline, no cap. Classroom: per-seat annual with dashboards. **Never ads** — this audience will leave. Note: the day you charge, Vercel Hobby no longer covers you.

**Moat.** Not the code — anyone can write a Pixi renderer. It's the content library and the tone. Sixty regions written this well is three person-years nobody copies quickly.

---

## 16. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Content rate too slow to sustain the product** | Highest | 16h/region is fixed. Don't start civilisation #2 before Rome's twelve are done. Build the studio the moment JSON authoring hurts. |
| Asset licensing turns out to be wrong | High | Manifest every file with source URL and licence at the moment of download, not later. Verify each item individually, not by artist death date alone. |
| Historical errors damage credibility | High | Source every claim. Get a postgrad reviewer. Ship a public corrections page — visibly correctable beats unchallenged. |
| Mobile performance | High | §11 budgets in CI. Device-tier degradation from M5, not bolted on later. |
| Scope creep into a strategy game | Medium | Re-read §1 non-goals whenever a "what if the player could…" idea appears. |
| Solo burnout | Medium | Ship Gallia publicly on its own after M8. Real feedback on one excellent region beats eleven unseen ones. |

---

## 17. Decisions needed before M0

1. **Border data source.** Verify licence on `aourednik/historical-basemaps` and DARE. Blocks M1.
2. **Drizzle or Prisma.** Recommend Drizzle. Blocks M0.
3. **History reviewer.** Find one before M8.
4. **Domain.** `.vercel.app` is free and fine until launch.

---

## Appendix — Claude Code working notes

- One milestone per session. Start each by having it read `CLAUDE.md` and the previous milestone's acceptance criteria.
- Content schema validation runs in CI. Malformed region JSON fails the build, not the runtime.
- `engine/` gets unit tests; scenes get Playwright screenshot comparisons at fixed beats.
- After M4, add `/dev/scene-lab` — loads any region JSON with hot reload. Pays for itself within a week.
- Write a short ADR file for every §17 decision as it's made. In six months you will not remember why.