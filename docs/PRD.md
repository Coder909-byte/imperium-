# Imperium — Product Requirements Document

**Working title:** Imperium (product) · "History Made Cool" (internal)
**Owner:** Jivesh Nazar
**Version:** 1.3 — repository/status reconciliation (v1.2 art decisions retained)
**Status:** M0–M10 implementation/local work complete, including additive M1.5. Gallia visuals/narration/quiz and redesigned shell/relief atlas are owner-accepted. M11 is partially delivered; its actual launch remainder is deferred. Next priority: the approved Italia/Rubicon episode; full prose and artwork scopes await separate review. See [current status](project-status.md).

> **Current implementation, 2026-10-23:** v1.2 below records the original painted-plane direction. Expanded M8 subsequently added specifically approved AI-assisted atmosphere/structural/painted-personnel assets and generated stock-voice narration (ADRs 012–015). These approvals remain scoped and generated files are not PD/CC0. Milestone history is retained under the same IDs; [ADR 019](adr/019-milestone-acceptance-and-region-workstreams.md) separates accepted region delivery from external launch verification.
>
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

**Original intended rig library for v1:** `legionary`, `auxiliary`, `cavalry`, `standard_bearer`, `gaul_warrior`, `civilian`. **Actually present:** procedural development `legionary` and three six-part provisional painted rigs: `roman_infantry`, `gaul_warrior`, `gaul_warrior_blue`. Painted parts preserve colour/alpha; they do not use luminance matte (ADR 014). No dedicated civilian, cavalry or standard-bearer rig is claimed.
**Clips per rig:** `idle`, `march`, `brace`, `thrust`, `fall`, `raise`.

Distant crowds are instanced quads. Procedural fixtures retain a shared four-frame march texture; painted crowds bake poses from their referenced rig/action and share transient atlases (ADR 014). Atlas textures still cost runtime memory/upload work; do not assume negligible cost or claim an unmeasured unit capacity.

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

**Camera** — GSAP moves a plain beat target; the render ticker combines it with seeded value-noise handheld drift and writes the root transform once per frame. It is not a GSAP transform writer competing with a second drift writer, and the shipped noise is not gradient Perlin. Every beat retains deliberate camera travel; reduced motion cuts camera/reveals and disables drift/parallax. See `engine/scene/Camera.ts` and `noise.ts`.

---

## 5. Tech stack

Every item is free. Where I recommend against something you already know, the reason is stated.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16, App Router, TypeScript** | RSC genuinely helps: content and quiz render server-side, only the scene player ships as client JS. |
| Atlas | **SVG + `d3-geo` + GSAP MorphSVG** | Crisp clickable vectors and border morphing. MorphSVG is free now, so no `flubber` dependency. |
| Scenes | **PixiJS v8** | WebGL. Thousands of sprites, real filter chains, 60fps mobile. SVG has a hard ceiling here. |
| Characters | **Cutout puppets — Pixi containers + GSAP-eased pose math** | Sparse keyframes, no per-instance timeline; current painted-part path is ADR 014. |
| Timeline | **GSAP** (free, all plugins) | Beat orchestration with seek, scrub and reverse for free. |
| Audio | **Howler.js** | Layered ambient beds with crossfade, sprite maps. Tone.js is overkill. |
| Auth | **Better Auth** + Drizzle adapter | TS-native, self-hosted, you own the user table. Email/password + Google. |
| Database | **Postgres on Neon** free tier | Serverless, branches per PR. |
| ORM | **Drizzle** | Implemented with Postgres/Better Auth adapter; settled in ADR 001. |
| Content | **JSON in-repo, Zod-validated** | Version-controlled content, CI-enforced schema. Authoring UI comes in v2. |
| Assets | **Current: repository `public/assets/`, served by Next** | R2 was a proposed launch storage option; no R2 shipping integration is implemented. |
| Hosting | **Proposed: Vercel; deployment unverified** | Choose/verify an authorized shipping setup and current terms during M11; this repository audit makes no live-deployment claim. |
| Analytics | **Planned: PostHog** | Not implemented. M11 must resolve hosted/account constraints and verify events. |
| Errors | **Planned: Sentry** | Not implemented. M11 must resolve setup and verify a release smoke event. |
| Fonts | **Self-hosted Cinzel (OFL), Georgia body** | Implemented shell/atlas typography; the root retains its existing Geist setup. EB Garamond was a plan, not installed shell work. |
| Audio assets | **Approved wind/Kenney CC0 cues; scoped generated narration** | Specific-file rights, manifest and owner scope required. CC-BY is not an implied exception to the PD/CC0 rule; ADR 015 is a separate narration exception. |
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
│     ├─ progress/{scene,migrate}/route.ts
│     └─ quiz/{session,answer}/route.ts
├─ engine/
│  ├─ scene/
│  │  ├─ SceneRenderer.ts       Pixi lifecycle, layer mount
│  │  ├─ Camera.ts              GSAP target + seeded value-noise drift
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
│  ├─ borders/{provinces,physical}/  province JSON + Natural Earth vectors
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

### Content (Zod; source files are authoritative)

Use `content/schema.ts` for Region/Beat/Rig/ManifestEntry, `content/questionSchema.ts` for private question authoring and `content/quizPublicSchema.ts` plus `lib/quiz/contracts.ts` for public/API contracts. All content types are inferred from Zod. The previous illustrative schema copy is superseded by these actual files, avoiding a parallel incomplete model.

Current region data includes camera opening/dwell mode, plane placeholder/draft/role/low-tier registration, actor depth/formation, per-beat sources, per-beat bed/cue gain and narration transcript/hash/duration. Region schema permits 1–10 beats for generic/dev content; authored production episodes target 4–8. Approved URLs/only-referenced rigs pass through `app/scene/[regionId]/buildSceneProps.ts`; `engine/` imports no content. See [region checklist](region-completion-checklist.md).

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
                guestHash, questionSnapshot (server-private), xpAwarded,
                startedAt, finishedAt    [userId nullable for anonymous ownership]
quizAnswer      id, sessionId, questionId, chosenOptionId,
                correct, timeMs, createdAt  UNIQUE(sessionId, questionId)
quizCredit      id, userId, questionId, sessionId, xp, createdAt
                UNIQUE(userId, questionId)
```

**`wrongQuips` is keyed by option ID, not one string per question.** A joke about the *specific* wrong answer someone picked is funny; a generic "nope!" is not. This is the difference between a feature people talk about and a feature people skip.

M9 authoring uses `content/questionSchema.ts`: exactly four distinct option IDs, a correct option reference, final-scene beat/source references and `feedbackByOptionId` containing all four options, including the correct answer. The seed adapter maps this to the existing DB `rightQuip`/`wrongQuips` columns. Client contracts live separately and explicitly allowlist public question fields; the private bank is never passed into a client component.

---

## 8. Feature specs

### 8.1 Atlas

- Framed period map: approved georeferenced relief beneath SVG borders, double border, corner rules, title cartouche and wind rose. Relief depicts modern physical geography, not reconstructed ancient land cover.
- Three inset mini-maps beside the map *are* the era switcher, with a row below the map on narrow screens (ADR 017). Click an inset, it swaps with the main map. Native scrolling and keyboard panning plus bounded zoom keep the map usable on narrow screens without widening the page.
- Held regions fill vermilion; labels fade in. Hover raises opacity and shows a one-line teaser.
- Historical held status and scene availability are separate (ADR 010). Authored campaigns are labelled scene previews with solid outlines; unauthored provinces use dashed outlines and named Coming soon destinations. A dated preview catalog makes available campaigns discoverable from every map era.
- Borders morph between eras via MorphSVG over ~900ms. Lost regions fade out, gained regions fade in.
- **Pending M11-L6:** completed-region gold wreaths are specified but not implemented. Profile viewed-beat completion is not an atlas mark.
- **Implemented data source (ADR 002):** Natural Earth physical GeoJSON and self-authored province geometry, with approximate historical boundaries. GPL historical-basemaps was rejected; DARE remains an unadopted reference candidate. The realistic relief depicts modern geography, not verified ancient terrain.

### 8.2 Cloud transition

Clash-of-Clans style. Two cloud masses sweep in from left and right, meet, hold ~250ms while the route swaps, then part. Total ~2.0s.

**CSS/SVG, not WebGL** (M3; see ADR 004). Each mass is a translated `<div>` with a static `feTurbulence`+`feDisplacementMap` filter for the noise-displaced organic edge — the same technique `AtlasFilters.tsx`'s `inkEdges` already uses — plus 12–16 drifting puff sprites (plain gradient circles, no filter) at varied depth and speed for parallax. All motion is `transform`/`opacity` only, driven by a dependency-free `requestAnimationFrame` tween, not GSAP: this overlay has to be ready on the very first click, with none of border-morphing's idle-prefetch grace period, so it ships eager rather than risk a cold dynamic import racing a click. WebGL was the original plan but would mean standing up a third render pipeline (atlas is SVG, scenes are Pixi) purely for a ~2-second overlay, paying real context-creation latency on the product's single most latency-sensitive interaction, for a shape that's fundamentally a 2D masked silhouette. This runs on every atlas↔scene transition and is the most-seen animation in the product. It deserves real polish.

### 8.3 Scene player

- Letterboxed. Caption block bottom-centre: year eyebrow, headline, body.
- `‹` `›`, pip indicators, autoplay toggle. Arrow keys and Escape bound.
- Autoplay follows an enabled narration's actual end plus one second. When narration is missing, muted, disabled or fails, fallback dwell = `max(7s, wordCount / 3.2 + 2.5s)` (ADR 015). Never a fixed reading interval — long beats get cut off.
- One narrator only, with trusted activation and immediate cancellation on navigation/exit. Separate narration/ambience switches plus master mute; full captions remain visible throughout.
- Pointer parallax on all planes; off under `prefers-reduced-motion`.
- **Sources drawer** per beat. Costs nothing, buys enormous credibility with the audience most likely to pick you apart.
- End card: "Test yourself on {Region}" / "Return to the map."
- Debounced viewed-beat progress POSTs/local storage and account import are implemented. **Pending M11-L6:** last-beat scene resume; the current scene starts at index 0. Quiz resume is already implemented.

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

Historical worked examples (tone illustrations, not the shipped Gallia bank; current questions use attributed claims and all-option feedback):

> **Q.** How long did Caesar's conquest of Gaul take?
> A) 8 years ✓ · B) 20 years · C) 3 years · D) 40 years
>
> ✓ **A** — "Eight years. He also wrote the only surviving detailed account himself, in the third person, so we have his word for basically all of it."
> ✗ **B** — "Twenty years, and he'd have been filing expenses the whole time. Eight. It took eight."
> ✗ **C** — "Three years is roughly how long the Nervii alone took to stop being a problem. Eight."
> ✗ **D** — "Forty years is an entire senatorial career. Caesar did it in eight and still had time for a civil war."

> **Q.** Why did Caesar build a *second* wall at Alesia?
> ✓ — "Correct. A relief army was coming, so he built twenty-one more kilometres facing outward. His army was besieging and besieged at once, which remains an extremely strange sentence."
> ✗ *(option: "to hold cavalry")* — "The cavalry were fine. The second wall faced outward, because Caesar claimed a quarter of a million Gauls were on their way to hit him from behind."

**Progression.** XP per correct answer, scaled by difficulty. Ranks are thematic and free: *Tiro → Miles → Immunis → Optio → Centurio → Primus Pilus → Legatus*. Daily streak. No leaderboards in v1 — they invite gaming and add moderation load.

**Owner-approved M9 policy, 2026-10-23 (ADR 018):** difficulty 1/2/3 awards 10/20/30 XP, banked only on completion of all five questions. Each account/question can award XP once, for its first correct answer. Retries can earn previously missed questions; already credited answers remain practice. Duplicate submissions are idempotent for the same choice; conflicting changes require a fresh retry. A transaction, ordered locks and a unique credit ledger enforce this on the server.

| Rank | Minimum XP |
|---|---:|
| Tiro | 0 |
| Miles | 50 |
| Immunis | 150 |
| Optio | 350 |
| Centurio | 700 |
| Primus Pilus | 1200 |
| Legatus | 2000 |

XP amounts and thresholds share `lib/quiz/progression.ts`. Thresholds are provisional and must be reassessed as more quizzes become available. Gallia alone offers at most 90 XP and cannot unlock every rank.

**Day policy:** completed quizzes, including practice retries, qualify once per server UTC calendar day. Adjacent days extend a streak; a missed day resets it. Display “Daily streak resets at 00:00 UTC”. Local time and client-supplied dates never determine activity. Signup/login imports count newly verified completed attempts as activity today, without reconstructing a past streak.

**Anonymous trust policy:** localStorage stores untrusted attempt references and viewed-beat IDs. Server attempts are owned by a random HttpOnly guest cookie, stored as a hash in the database. Import only completed, owned attempts; regrade stored answers and deduplicate credit. Ignore unverifiable references and reject submitted XP/ranks/scores/dates. Viewed-beat imports are convenience records and award neither XP nor streak activity. No timer or quiz deadline; an owned unfinished attempt remains resumable after a reading break. Atlas and scenes remain public. Shared Neon migrations/seeding require separate owner approval.

---

## 9. Content production — the actual bottleneck

Engineering is ~7 weeks of evenings. Content never ends. Plan around it.

**Per region:** 4h research and drafting · 2h fact-check · 5h art (sourcing paintings, plane separation, colour export) · 2h scene composition and camera · 2h quiz writing with per-option quips · 1h audio. **≈16 hours.**

The painted workflow doesn't move this estimate. Sourcing a painting instead of an engraving is the same search-and-license effort; plane separation is the same lasso-and-clone-stamp workflow either way; the only step that changes is the export pass, which gets *simpler* (skip desaturate/level/luminance-to-alpha, export straight to WebP). Still ~5h.

Twelve regions for a credible launch ≈ **190 hours**. That is the real schedule. Everything else is a rounding error.

**Production and launch status are separate.** Use [the region-completion checklist](region-completion-checklist.md) for local delivery and owner approval. Cross-cutting release/device/accessibility/provider checks belong to [M11](m11-launch-scope.md), while specific historical questions stay in region documents. The following original requirements remain public-release targets, not a reason to relabel accepted Gallia unfinished or reopen it cosmetically.

**Gates before public release:**
1. Every factual claim traceable to a source. Wikipedia may be the route to a source; it is not the source.
2. Disputed numbers flagged as disputed in the copy. Ancient troop figures are propaganda — say so.
3. A second pair of eyes on the history. A history postgrad reviewing for credit is the cheapest credibility you will ever buy.
4. Every asset's source URL and licence recorded in `content/assets/manifest.json`.
5. Read the copy aloud. If it sounds like an encyclopaedia, rewrite it.

**Original launch set (12), not mandatory production order:** Gallia, Britannia, Italia, Aegyptus, Judaea, Dacia, Hispania, Africa, Asia, Syria, Graecia, Germania. Actual atlas IDs differ in places (Africa is `africa_prov`; Germania is not yet an authored province). Only Gallia is currently playable; fixtures are not campaigns. The owner prioritizes a second region before M11. Release catalog size remains a later decision; see [inventory](region-inventory.md).

Gallia/Alesia is the flagship. Build it to the ceiling and make it the bar everything else must clear.

---

## 10. Milestone record and current workstream

Preserve M0–M11 and the existing additive M1.5 identifier. [The original plan/acceptance targets](history/2026-10-23-build-plan.md), [dated state log](history/2026-10-23-milestone-record.md) and ADRs retain history. [Current project status](project-status.md) gives the evidence and separates local implementation, owner acceptance and external verification; old checkmarks are not automatic hardware/provider/launch passes.

| ID | Corrected delivery status |
|---|---|
| M0 — Foundation | Implemented/local verification complete: Next.js 16, Better Auth/Drizzle, protected profile, unit/browser tooling and CI. Live provider/target checks are M11. |
| M1 — Atlas | Implemented/local verification complete; expanded relief/viewport/navigation/availability UI is owner-accepted. |
| M1.5 — Shell addition | Landing/auth/profile makeover implemented, locally verified and owner-accepted. M9 later replaces the live profile's empty shell with real progress/history. |
| M2 — Border morphing | Implemented/local verification complete; target-device cadence is an M11 check. |
| M3 — Cloud transition | Implemented/local verification complete with CSS/SVG and reduced motion (ADR 004); hardware/network targets remain M11. |
| M4 — Scene core | Implemented/local verification complete: Pixi lifecycle, registered layers/camera, beats/captions/sources/controls. |
| M5 — Post/particles | Implemented/local verification complete; strict mobile/GPU acceptance remains M11. |
| M6 — Puppets | Implemented/local verification complete: sparse pose evaluation, rig lint/inspector and instanced/rig-derived crowds. |
| M7 — Asset forge | Implemented/local verification complete: colour WebP, optional matte/batch processing, provenance and validation. |
| M8 — Gallia flagship, expanded | **Complete for the owner-accepted current visuals/narration.** Expanded approved atmosphere/provisional structure art, painted personnel and six generated narration recordings are explicitly included. |
| M9 — Quiz/progression | **Implemented/local verification complete and quiz owner-accepted.** Server grading, five questions, feedback/results, transactional XP, ranks, UTC streak and verified guest import. |
| M10 — Audio | **Implementation/local audit complete.** Existing M8 audio retained; 12 focused browser checks and full six-recording production autoplay/cleanup pass. |
| M11 — Shell/launch | **Partially delivered.** Accepted shell/profile/atlas work, scoped accessibility, basic metadata/guards and CI exist. Only unchecked launch checklist items remain; deferred behind region two. |

**Expanded M8 history:** ADR 009 moved the minimum Howler foundation from M10 to M8; ADRs 012–014 added scoped atmosphere/structure/personnel preparation and rig-derived crowds; ADR 015 added owner-approved stock George narration. Files keep their actual provenance/draft labels; acceptance is not a blanket new asset licence or a claim that every originally imagined figure/plane exists. [Gallia status](regions/gallia-status.md) preserves its specific historical/representation questions and accepted omissions.

**M9 policy:** ADR 018 and §8.5 remain authoritative. Shared-target migration/seed/provider state is not established by local success; M11 checks the approved target before any authorized write.

**Current priority, 2026-10-25:** produce a second playable Roman region through the existing content systems, ahead of M11. [Italia / the Rubicon crisis](regions/italia-rubicon-proposal.md) and its six-beat outline are owner-approved. [Full prose](regions/italia-prose-review.md) is drafted for approval; a clearly marked temporary scene/atlas entry and demonstrated metadata/progress integration are implemented. [Artwork/use scopes](regions/italia-artwork-proposal.md) await a batched decision. Quiz authoring and established George narration follow prose approval. Italia is not complete with its visible placeholders; [regional status](regions/italia-status.md) records exact gates. No M11 launch implementation, Gallia cosmetic reopening, speculative engine expansion, commit/push/deploy or shared-data mutation is authorized by this reconciliation. [ADR 019](adr/019-milestone-acceptance-and-region-workstreams.md) records the sequencing change.

**M11 remainder:** [item-by-item audit](m11-launch-scope.md): advanced metadata/OG/sitemap/robots; analytics and monitoring setup; launch-wide accessibility/Read as text; completion wreaths/scene resume decisions; Lighthouse and actual-device/network/performance acceptance; approved target/provider/release checks and content-release review. Delivered design work is already complete. These are release checks/work, not new blockers on accepted Gallia or the owner's next-region priority.

---

## 11. Performance budgets

Required budgets. Content/reference/asset checks run in CI; actual device/runtime/Lighthouse acceptance is not automatically certified there and remains M11-L7/L8. WebGL products die on mobile.

| Metric | Budget |
|---|---|
| Atlas TTI | < 2.0s on 4G |
| Scene first beat interactive | < 3.0s, decomposed: ~0.8–1.1s is a fixed GPU-side Pixi/WebGL `app.init()` floor (measured M5 post-split, flat across CPU throttle — not addressable by code-splitting or bundle size), leaving ≤ ~1.9–2.2s for bundle transfer/parse + scene-graph build. Measured 3.02–3.11s unthrottled against placeholder content as of M5 — over budget by design-intent but not yet by feel; recorded as a known gap (see the preserved milestone history and M8/M10 reviews), revisit with real M8 art rather than restructuring init around it now. |
| Scene frame time | < 16ms on Pixel 6a class |
| Scene asset payload | < 2.5MB per region. **Measured M7** (`tools/forge`, a real 6000×3694 CC0 painting, not estimated — see `docs/art-pipeline.md` §7 for the full width×quality grid): a full-width (1920px) colour plane at WebP quality 75–78 runs **~385–450KB**, roughly quadrupling per doubling of width (2560px ≈ 700–930KB, 3840px ≈ 1.4–2.0MB). The old ~200KB/plane figure (ADR 003) was an alpha-line-art-era assumption, superseded, not adjusted — colour planes are genuinely heavier. **`--matte` is not reliably cheaper**: a densely cross-hatched engraving's alpha channel is high-frequency detail throughout and can compress *worse* than a colour plane at the same width/quality (measured: a Piranesi etching at 1200px ran 753KB matte vs. 375KB colour) — budget a character-part crop by its own (usually small, since tightly cropped) resolution, never by assuming the format is cheap. Budget the total first, including narration/audio/rigs; six ~400KB planes are not a safe narrated-region allowance. Gallia already uses 1,653,554 audio bytes. Choose widths/quality per actual cut and reserve full resolution for approached planes; `npm run validate` measures unique referenced files against the strict 2.5 MiB implementation ceiling. |
| Atlas route JS | < 180KB gzipped |

Low-end detection degrades to 4 planes, halved particles, no godrays or chromatic aberration. **Never ship a stuttering scene** — a stuttering cinematic is worse than a static image.

---

## 12. Accessibility

- `prefers-reduced-motion`: parallax off, camera moves become cuts, minimal particles, cloud transition becomes a 200ms fade. Content stays fully available.
- Every beat's text is real DOM, not baked into canvas. Screen readers get the full narrative.
- Full keyboard nav: focusable atlas regions, arrow keys drive beats, Escape exits.
- Captions meet 4.5:1 against the letterbox, not against the scene.
- **Pending M11-L5:** a "Read as text" article/toggle; scene DOM captions are delivered, but this specified article is not.

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

1. **Border data source — decided (ADR 002).** Natural Earth physical data plus self-authored provinces; the original GPL candidate was rejected. DARE was not adopted. Historical decision retained; M1 is not blocked.
2. **Drizzle or Prisma — decided (ADR 001).** Drizzle is implemented; M0 is not blocked.
3. **History reviewer — external review unverified.** M8 current experience is owner-accepted; cross-cutting public-release review is M11-L10, with specific Gallia issues retained in its region document.
4. **Domain/deployment — unresolved target verification.** No live domain/deployment is certified by this repository audit; retain under M11-L9.

---

## Appendix — Claude Code working notes

- Keep milestones stable and one authorized workstream per session. The owner explicitly prioritizes Italia/Rubicon before M11; its outline is approved, full prose needs approval before quiz/narration, and new art/use scopes need their recorded decision. Read synchronized AGENTS/CLAUDE and current project/region status.
- Content schema validation runs in CI. Malformed region JSON fails the build, not the runtime.
- `engine/` gets unit tests; scenes get Playwright screenshot comparisons at fixed beats.
- After M4, add `/dev/scene-lab` — loads any region JSON with hot reload. Pays for itself within a week.
- Write a short ADR file for every §17 decision as it's made. In six months you will not remember why.
