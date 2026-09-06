# CLAUDE.md

Conventions for this repository. Read this at the start of every session.

## What this is

**Imperium** — an interactive historical atlas. Click a region on a period map, transition through clouds into an animated cinematic scene that tells you what happened there, then take a quiz on it. Rome first; the engine must generalise to other civilisations.

Full spec: `docs/PRD.md`. Read the relevant section before starting a milestone. Don't read the whole thing every session.

## Stack

- Next.js 16 (App Router) · TypeScript strict · React 19
- **Atlas:** SVG + `d3-geo` + GSAP MorphSVG
- **Cloud transition:** CSS/SVG (`feTurbulence`+`feDisplacementMap`, no library) + Zustand — not WebGL (ADR 004)
- **Scenes:** PixiJS v8 (WebGL) + GSAP timelines + `pixi-filters`
- **Characters:** cutout puppet rigs — Pixi containers with GSAP-rotated parts. No Rive, no Spine.
- **Audio:** Howler.js
- **Auth:** Better Auth · **DB:** Postgres (Neon) + Drizzle
- **Content:** JSON in `content/`, validated with Zod
- **Test:** Vitest (unit) + Playwright (e2e)

Everything here is free to use. **Do not add a dependency that costs money, has a paid tier required for production use, or requires an account to ship.** If one seems necessary, stop and ask.

## Hard rules

1. **`engine/` never imports from `content/`.** Content is passed in as arguments. This is what makes adding a second civilisation cost zero engine work. Breaking it defeats the architecture.
2. **The quiz answer key never reaches the client before submission.** `/api/quiz/session` strips `correctOptionId`. Grading happens in `/api/quiz/answer`. This is tested in Playwright.
3. **Every art or audio asset gets a row in `content/assets/manifest.json`** with source URL and licence, added at the moment it enters the repo. No exceptions.
4. **No asset ships without a verified public-domain or CC0 licence.** Artist death dates are not proof; the specific scan's rights status is.
5. **Content schema validation is a CI gate.** Malformed region JSON fails the build, never the runtime.
6. **`prefers-reduced-motion` is respected everywhere**, and the content stays fully available when it's on.

## Directory structure

```
app/            Next.js routes and API handlers
engine/         rendering. Pure. Never imports content/
  scene/        SceneRenderer, Camera, BeatDirector, layers/, puppet/, particles/, post/
  atlas/        projection, MorphBorders, AtlasMap
  transition/   CloudSweep (atlas<->scene, CSS/SVG not WebGL — ADR 004), transitionStore, sweepTween
  audio/        AudioDirector
content/        region JSON, questions, geojson, rigs, assets/manifest.json, schema.ts
tools/forge/    CLI: source scan → WebP scene plane (colour for paintings, alpha for engravings/character parts)
db/             Drizzle schema and migrations
lib/            auth.ts, auth-client.ts, env.ts — server/client glue, not engine or content
docs/           PRD.md, adr/
```

## Conventions

- TypeScript strict. No `any` — use `unknown` and narrow.
- Zod schemas are the single source of truth for content shapes. Infer TS types from them (`z.infer`), never hand-write a parallel interface.
- Server Components by default. `'use client'` only where a browser API or interactivity requires it. The scene player is client; everything around it is server.
- Zustand for client state. No Redux.
- Tailwind for site chrome (nav, forms, profile, quiz). Hand-written CSS for the atlas and scene player — the cinematic UI needs control Tailwind fights.
- Named exports. Default exports only where Next.js requires them (pages, layouts).
- Files under ~300 lines. Split when they grow past it.
- Comments explain *why*, not *what*. Delete any comment that restates the code.

## Rendering rules

- **Atlas is SVG. Scenes are Pixi.** Do not mix. They have different jobs.
- Every beat gets camera motion. Never a static hold.
- Handheld camera noise (Perlin, ~0.4Hz, 3–6px translate, 0.2° rotate) runs permanently in scenes. It is not optional polish; it is most of the perceived quality.
- Scene backdrop planes are full-colour painted art (PRD §3) — never strip colour at the asset level. Cross-source consistency comes from the per-scene LUT via `ColorMatrixFilter` in the post chain, not from monochrome-with-alpha assets. Alpha-from-luminance is still used, but scoped to cutout character parts and foreground silhouettes, where a clean matte matters more than colour fidelity.
- Distant crowds are instanced quads on a shared texture, never individual puppet rigs.
- Detect low-end devices and degrade: 4 planes, halved particles, no godrays or chromatic aberration. A stuttering scene is worse than a static image.

## Performance budgets

Enforced. Do not merge work that breaks these.

| Metric | Budget |
|---|---|
| Atlas TTI | < 2.0s on 4G |
| Scene first beat interactive | < 3.0s |
| Scene frame time | < 16ms on Pixel 6a class |
| Scene assets per region | < 2.5MB |
| Atlas route JS | < 180KB gzipped |

**How "Atlas route JS" is measured** (settled M2, after an initial mismeasurement — see M2 in Current State): `npm run build`, then `npm run start`, then real HTTP requests with `Accept-Encoding: gzip` against exactly the `<script src>` tags the served `/atlas` HTML contains, summing real transferred (`Content-Length`) bytes. Excludes the `noModule` legacy-polyfill chunk — real target devices (Pixel 6a class, evergreen browsers) never fetch it, so counting it measures bytes no user transfers. Don't substitute a bundle-analyzer's per-module `compressed_size` field for this — module-level compression estimates don't reflect a single real gzip pass and overstate the true figure (confirmed the hard way in M2: apparent 168KB that a real network capture showed was actually 133KB).

## Writing (when generating any user-facing copy)

- Plain, direct sentences. No marketing voice.
- Quiz feedback punches at history or at the wrong answer — **never at the user**. Dry, not zany. No emoji, no "Oof!", no exclamation spam. Under 30 words. Every quip must still teach the correct fact.
- Beat copy: 180–700 characters, concrete detail over summary. If it reads like an encyclopaedia, rewrite it.
- Ancient numbers are claims, attributed to whoever claimed them.
- Errors state what went wrong and how to fix it. They don't apologise.

## Commands

```bash
npm run dev            # dev server
npm run build          # production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run test           # vitest
npm run test:e2e       # playwright
npm run validate       # zod-validate all content/ JSON
npm run db:generate    # write a migration file from schema changes
npm run db:migrate     # apply pending migrations in db/migrations/ to the database
npm run db:push        # push schema directly, no migration file — throwaway experiments only, never part of a documented flow
npm run forge -- <file>  # source scan → scene plane (colour or alpha, see PRD §3)
```

`npm run validate` and `npm run typecheck` must pass before any commit.

## Working style

- **One milestone per session.** Milestones are in `docs/PRD.md` §10, each with acceptance criteria. Do not start the next until the current one's criteria pass.
- Before writing code for a milestone, restate the acceptance criteria and outline the approach. Wait for confirmation on anything ambiguous.
- Write the test alongside the feature, not after.
- When a decision from PRD §17 gets made, write a short ADR in `docs/adr/NNN-title.md`: context, decision, consequences. Three paragraphs is plenty.
- If something in the PRD turns out to be wrong or impossible, say so and propose an alternative. Don't silently work around it.

## Current state

Milestone: **M4 — Scene engine core — complete.** `engine/scene/`: `SceneRenderer.ts` (Pixi v8 `Application` lifecycle — idempotent `status` machine so an `init()` still in flight when `destroy()` fires never attaches a canvas; `app.destroy({removeView:true},{children:true,texture:true,textureSource:true})` on teardown), `Camera.ts` (GSAP tween on a plain `beatTarget` object, combined with permanent handheld drift inside one ticker callback that writes the container's `x`/`y`/`scale`/`rotation` exactly once a frame — drift constants live in one place, `HANDHELD_DRIFT`, explicitly commented as eyeballed-not-measured), `BeatDirector.ts` (a subscribe/getSnapshot store, `useSyncExternalStore`-shaped like `transitionStore.ts`; owns beat index + autoplay + the dwell timer, nothing else), `dwell.ts` (`max(7s, words/3.2+2.5s)`), `noise.ts` (hand-rolled seeded 1D value noise — see below, a deliberate departure from "Perlin"), `layers/ParallaxPlane.ts` (sprite + one-time `ColorMatrixFilter`/`BlurFilter` construction + depth-scaled pointer offset), `layers/placeholderColor.ts`+`placeholderTexture.ts`+`placeholderBand.ts` (procedural placeholder art), `ScenePlayer.tsx` (letterbox, captions, pips, ‹›, autoplay toggle, keyboard). `content/regions/placeholder.json` — new file, 5 beats, varying camera moves/visible-layer combinations/body lengths — exercises all of it; `gallia.json` untouched (still real Alesia content, still one beat, still Gallia's to fill out at M8). `/scene/[regionId]/page.tsx` now renders the real player for any region with content, and still falls back to the M1 stub (same h1-with-title-cased-slug shape) for one that doesn't — `e2e/atlas.spec.ts`/`transition.spec.ts`'s existing Latium-stub assertions needed no changes. `/dev/scene-lab` (PRD appendix, built now rather than deferred): a dev-only page (`notFound()` outside `NODE_ENV=development`) that polls `/api/dev/region-content` (re-reads+re-validates one region file from disk per request, uncached) once a second and remounts `ScenePlayer` on real change — not true HMR, but robust and simple for a tool that pays for itself immediately.

**Three real bugs found by actually running this, not by reasoning about the code:**
- **A React StrictMode bug that silently broke every beat-navigation control.** `BeatDirector` was constructed once via a `useState` lazy initializer (so it survives StrictMode's dev-only mount→cleanup→mount on the *same* instance), but its cleanup effect called a `destroy()` that set a permanent `destroyed` flag gating `next()`/`previous()`/`jumpTo()`/`setAutoplay()` — so the StrictMode cleanup pass poisoned the one live instance before the "real" mount ever got a click. Caught via a real Playwright click producing zero DOM change (not a hunch): the caption never advanced past beat 1, pips never moved, and there was no console error to point at it, because nothing threw. Fixed by dropping the permanent flag — `destroy()` now only clears the pending dwell timer and listener set (the actual resource worth protecting), which is idempotent and safe to call any number of times without disabling the object.
- **Full-bleed placeholder planes made every plane but the frontmost one permanently invisible.** The first version sized every plane to the same oversized rectangle centred on the stage — visually correct in isolation, but stacking two or more fully-opaque same-size rectangles means you only ever see the topmost one, so depth-scaled parallax had nothing to visually demonstrate no matter how correct the offset math was. Caught from an actual screenshot of beat 1 (`visibleLayers: ["sky","far_hills"]`) showing only far_hills. Fixed with `placeholderBand.ts`: each plane's height is now `1 - depth*0.7` (floor 0.3) of the overscan box, bottom-anchored, so a farther (taller) plane's top edge always peeks out above a nearer (shorter) one — the classic layered-horizon composition, achieved with nothing but flat rectangles. A second, smaller instance of the same class of bug followed immediately: the decorative top letterbox bar was 6% of player height, which — coincidentally — covered almost exactly the sky sliver the band fix was supposed to reveal. Shrunk to a 4px accent line. Both verified visually afterward: real Playwright screenshots (not assumed) show four clearly distinct, depth-labelled bands, and moving the pointer between the frame's edges visibly shifts the mid-ground/foreground seam while the sky/far-hills seam barely moves — the depth ordering is genuinely legible, not just mathematically correct.
- **`useSyncExternalStore` needs `getServerSnapshot` for anything the server might render, and Pixi has no server-safe rendering at all.** `next start` + real request (not just `next build`) surfaced `Missing getServerSnapshot` on `/scene/gallia` — `ScenePlayer` is `'use client'` but Next still SSRs client components for the initial HTML, and `BeatDirector`'s snapshot has no meaningful server value. Rather than plumb a server snapshot through for a canvas-based component with no server-renderable output anyway, `ScenePlayerClient.tsx` now `dynamic()`-imports `ScenePlayer` with `ssr:false` (a `loading` fallback reuses the player's own aspect-ratio box, so there's no layout shift). This turned out to be exactly the fix constraint #1 anticipated for a different reason (bundle isolation) — it solves both at once.

**Bundle — verified with the same method as M2/M3 (production build, `next start`, real gzip'd HTTP request, `noModule` excluded), reported for both routes as asked:**
- **Atlas: 136.4KB gzipped** — unchanged within noise from M3's 136.1KB (43.6KB headroom against the 180KB budget). `/scene/[regionId]`'s own chunks never appear in `/atlas`'s served HTML, confirmed by diffing every `<script src>` between the two routes, not assumed from the import graph.
- **Scene route (`/scene/gallia`) initial JS: 135.0KB gzipped** — slightly *under* atlas, because `ssr:false` means Pixi isn't part of this number at all: the route's only addition over the shared framework/layout chunks is a ~2.1KB dynamic-import wrapper. Confirmed the atlas-only chunk (GSAP/MorphSVG, ~3.6KB) is the one thing present in atlas but absent from scene, and vice versa for the wrapper — exactly one route-specific chunk each, everything else shared.
- **The actual scene engine (Pixi + Camera + BeatDirector + ParallaxPlane + ScenePlayer): 71.6KB gzipped across 3 chunks**, fetched lazily the moment `ScenePlayer` mounts client-side, confirmed absent from both routes' initial `<script>` tags by grepping `.next/static/chunks/*.js` for Pixi's own source strings (`ColorMatrixFilter`, `PixiJS`) and cross-checking those exact chunk names never appear in either route's served HTML. Pixi genuinely never lands in the atlas bundle.

**WebGL context count and memory — a real Playwright test (`e2e/scene.spec.ts`, "WebGL lifecycle"), not a one-off check:** ten direct `/scene/gallia` ↔ `/atlas` round trips (real content, a real mounted Pixi `Application` each time, not the unauthored stub) leave exactly one `<canvas>` at every intermediate point and zero "too many active WebGL contexts" console warnings — the real browser-level signal for context exhaustion — across five separate runs. Heap (`performance.memory.usedJSHeapSize`, sampled after two forced `HeapProfiler.collectGarbage` passes at trip 1 and trip 10) is noisy — five runs landed at -5KB, -135KB, +146KB, +477KB, +839KB, +1.50MB of apparent growth over the 9 further round trips — but never monotonic across a run and small relative to a ~12MB baseline heap; read as GC/router-cache noise, not a Pixi leak, especially given the StrictMode `BeatDirector` bug above was found by *this same kind of close checking*, so the absence of an equivalent pattern here is meaningful. No device/mobile GPU compositing behaviour verified — desktop Chromium only, same caveat M3 flagged for its own trace work.

**Frame time under throttle:** not separately captured this session — the Chrome DevTools extension (`claude-in-chrome`) wasn't connected in this environment, which also blocked a live visual read (below). Worth doing as a follow-up the way M3's hover/morph numbers were: a real CDP trace with `Emulation.setCPUThrottlingRate`, reported as throttled-desktop, honestly labelled, not inferred.

**Handheld drift — an honest read, with the limits of what I could actually verify stated up front.** No connected browser this session, so this isn't "I watched it play and here's my impression" — it's a real Playwright-rendered screenshot series (`/scene/placeholder`, drift only, past the initial beat's camera tween settling) cross-correlated frame-to-frame in pure Python (no visual judgment involved in that part): horizontal-row shifts of 3–10px across frames 450ms apart over a ~3.6s window, continuously varying rather than static or repeating — consistent with the configured `HANDHELD_DRIFT` amplitudes (5px/4px/0.2°), confirming the mechanism runs as coded. My best *subjective* read, reasoning from those magnitudes against a ~1280px-wide canvas (well under 1% of frame width per axis): likely closer to "invisible" than "seasick" against real painted art, but placeholder art's bold text labels and regular diagonal hatching are exactly the kind of hard-edged, regular detail that makes a few-px shift more perceptible than it would be against a photographic plane — so it may read slightly *more* noticeable here than it will once real art lands, not less. Flagging this honestly rather than guessing: worth a real look together once the extension is connected, and the constants are named and commented as provisional for exactly that reason.

**Everything else asked for and verified:** keyboard nav (arrows drive beats, Escape exits through the same `requestSweep`+`router.push` pattern `BackToAtlasButton` uses, via a routing-agnostic `onExit` prop so `ScenePlayer` itself stays ignorant of "/atlas"); `prefers-reduced-motion` (camera cuts instead of tweens, drift and pointer parallax both fully disabled — parallax listener isn't even attached, not just zeroed); the caption block is a real `aria-live="polite"` region, matching the atlas's own hover-teaser pattern; autoplay dwell verified against the real formula in both directions (unit tests with fake timers, e2e with real ones). `engine/scene/` never imports `content/` — region data arrives as `SceneRegion`/`SceneBeat`/`ScenePlane` (`types.ts`, independent of `content/schema.ts`'s Zod-inferred types, same split `engine/atlas/types.ts` already established) via `app/scene/[regionId]/buildSceneProps.ts`. `actors`/`fx`/`audio`/`sources` exist in the content schema but aren't rendered yet — puppets (M6), particles/post (M5), and audio (M10) own those, so wiring them through now would be plumbing with nothing on the other end.

Perlin noise (PRD §4) is hand-rolled seeded 1D *value* noise, not true gradient noise — a deliberate, flagged departure to stay dependency-free, matching `sweepTween.ts`/`generatePuffs.ts`'s existing precedent rather than adding a noise library for one effect.

M1–M3 unchanged: atlas (`projection.ts`, `MorphBorders.ts`, `AtlasMap`/`AtlasFrame`/`AtlasInsets`/`AtlasFilters`, four eras, hover/morph paint fix) and the cloud sweep (`CloudSweep.tsx`, `transitionStore.ts`, `sweepTween.ts`) are exactly as M2/M3 left them. `engine/` still never imports `content/`.

**Post-M4 fixes (same session, before starting M5) — diagnosed live with a real Playwright-driven Chrome, not inferred from code, per the M4 note above that the extension wasn't connected last time:**
- **The missing-region path was already clean, just thin.** Confirmed via real console/network capture (`page.on('console'|'pageerror'|'requestfailed')`) clicking Latium from the atlas and navigating `/scene/latium` directly: HTTP 200, zero console errors, zero `<canvas>` elements — no broken player, no empty Pixi mount. But the actual page was a bare white Tailwind box with no letterbox chrome, no Latin name, and a name derived only by title-casing the URL slug (would've been wrong for any id that doesn't happen to match its display name). Replaced with `NotYetWritten.tsx`: same `.player`/`.captionBlock`/`.eyebrow`/`.headline`/`.body` classes `ScenePlayer.module.css` itself uses (real shell, not a look-alike), province name + Latin name pulled from `content/borders/provinces/{id}.json` (`loadProvince.ts` — exists independently of `content/regions/`, so it's there for all 24 provinces regardless of campaign status), an honest "hasn't been written yet" line, and `BackToAtlasButton` restyled to the shell's own pill-button class instead of a light-page Tailwind pill that only made sense on the page it replaced. `e2e/scene.spec.ts`'s unauthored-region test now asserts the Latin name renders and the return button actually navigates, not just that text is present.
- **`content/regions/placeholder.json` had no click path from the atlas** — it isn't a province (no polygon on the map), so `/scene/placeholder` was a typed-URL-only route. Added `DevPlaceholderLink.tsx`, a `?dev=1`-gated button on `/atlas` (hidden by default, `useSearchParams` behind a `Suspense` boundary so it doesn't force the whole route to dynamic rendering) that sweeps straight to it. Marked TEMPORARY in both the component and its e2e test with a note to remove alongside the `?dev=1` branch at M8, once every held province has real content and a real click target.
- **Confirmed, not assumed, that the beats are genuinely distinct**, per-beat screenshots of `/scene/placeholder` (camera settled, not mid-tween): visibly different band colours/counts and letterbox framing at every one of the 5 beats — 2 planes → 3 → 3 (sky dropped) → 2 tight-zoomed → all 4 pulled back — with camera pans/scale already ranging ±75px and 0.92–1.3x. The beat system is visibly driving change, not swapping captions over a static frame; JSON left as-is.
- Vitest + Playwright green (27 e2e, 108 unit — up from 26/108).

Milestone: **M5 — Post-processing and particles — complete.** `engine/scene/post/`: `lut.ts` (4 presets — `cold_overcast`/`warm_dusk`/`night`/`arid_heat` — expressed as an ordered list of `ColorMatrixFilter` method calls rather than hand-written matrices, so `applyLutPreset` is unit-testable against a fake filter object; unknown/legacy `lut` keys, e.g. gallia.json's `"engraving_dust"`, resolve to `cold_overcast` rather than throwing), `VignetteFilter.ts` (hand-rolled — pixi-filters v6 dropped the old VignetteFilter, see ADR 005), `PostChain.ts` (all six filters built once in the constructor; `selectActiveFilterIds` is the pure, tested piece deciding which are *currently* assigned to `stage.filters` — Godray needs `tier==="high" && lightSourceActive`, chromatic aberration needs `tier==="high"`, everything else is always on unless the whole chain is toggled off). `engine/scene/particles/`: `types.ts`, `textures.ts` (two procedural canvas shapes — `soft-dot`, `streak` — no raster assets, each `ParticleField` draws its own rather than sharing one), `emitterConfigs.ts` (pure spawn/update math per fx kind, `fadeEnvelope` shared, `resolveParticleCount` for tier/reduced-motion), `ParticleField.ts` (one `ParticleContainer` + a fixed-size pool of `Particle`s, ticked externally). `engine/scene/deviceTier.ts`: `detectStartingTier` (conservative — missing `hardwareConcurrency`/`deviceMemory` defaults to low) plus `DeviceTierController`, which then *watches real frame time* (rolling-median `recordFrameSample`, `THRESHOLD_MS=20`, `SUSTAINED_MS=2000`) and downgrades high→low on a sustained breach — never upgrades, logs the reason (`heuristic` vs `runtime`) to the console in dev either way. `engine/scene/Camera.ts` gained `SCREEN_SHAKE` (`computeShake`, its own noise channels, an `intensity` GSAP-faded 0↔1) — additive with `HANDHELD_DRIFT` in the same tick, never replacing it; `animateTo`'s new `{shakeActive}` option is the one call site. `engine/scene/SceneEffects.ts` composes PostChain + the six `ParticleField`s + `DeviceTierController` behind one ticker callback and `applyBeat(fx, lightSource)`/`setReducedMotion()`/`setLutPreset()`/`setChainEnabled()`. `engine/scene/layers/selectActivePlanes.ts` applies PRD §11's 4-plane low-tier cap, spanning the full depth range rather than favouring authoring order. `content/schema.ts`'s `Beat` gained `lightSource: boolean` (default false) — an explicit per-beat author call, since neither `fx` nor `lut` reliably implies a light source is in frame. `content/regions/placeholder.json`'s 5 beats now carry `fx`/`lightSource`, one combination per beat, covering all six emitters plus shake (`dust` / `rain` / `smoke+embers` / `fire+shake` (`lightSource:true`) / `arrow_volley`). `/dev/scene-lab` gained three preview-only overrides — Tier (Auto/Force high/Force low, pinned — disables the runtime monitor), LUT (Auto or any of the 4 presets, hot-swapped live, no remount), Post chain (On/Off, for the chain-on/chain-off comparison) — threaded through `ScenePlayer`'s new `forcedTier`/`forcedLut`/`forcedChainEnabled` props, which the real `/scene/[regionId]` route never sets.

**Five real bugs found by actually running this, not by reasoning about the math or the docs — this milestone's rabbit hole, in the order they were found:**
- **Particles rendered nothing at all, silently, for most of the session.** Root cause: pixi.js's WebGL/GPU/Canvas particle render pipes are registered by a side-effect-only module (`scene/particle-container/init.mjs`) that `ParticleContainer.mjs` itself imports — and although pixi.js's own `package.json` explicitly lists that file under `sideEffects`, Turbopack still tree-shook it out of every built chunk (confirmed by grepping `.next/**/chunks/*.js` for `GlParticleContainerPipe` and finding it in none of them). No error, no warning — a `ParticleContainer` with no matching pipe just draws nothing. Fixed with `import "pixi.js/particle-container"` — pixi.js's own public subpath for exactly this — placed in `SceneRenderer.ts` *before* `new Application()`/`app.init()`, not merely before the first `new ParticleContainer()` (an earlier attempt registered the pipe from inside `ParticleField.ts`, too late: the renderer had already finished building its pipe list from whatever was registered at that moment). Found only by bypassing every abstraction down to a bare `new ParticleContainer()` constructed inline and watching it *also* fail to render — which is what pointed at pipe registration instead of anything in this codebase's own particle math.
- **A top-left coordinate assumption, when the engine is centre-origin throughout.** The first version of `emitterConfigs.ts` spawned particles at `x ∈ [0, bounds.width]` — correct for a top-left-origin canvas, wrong for this one: `ParallaxPlane` (anchor 0.5) and `Camera` (which centres `cameraContainer` on the stage) both treat local `(0,0)` as frame *centre*. Every particle rendered at some multiple of half a screen width off to one side. Fixed by rewriting all six configs' position math to `(rand()-0.5) * bounds.width` (and the height equivalent), documented at the top of the file.
- **Particles positioned against the *overscanned* stage size, not the true visible one.** `getBounds` was reusing planes' `PLANE_OVERSCAN` (1.35×) bounds — sensible for planes (deliberately oversized so camera drift never reveals empty canvas past their edge) but wrong for particles, which are discrete and meant to be seen: an offset chosen as "80% toward the bottom of `bounds.height`" was actually ~9% past the *true* visible bottom edge once the 1.35× was undone. Fixed: `ScenePlayer.tsx`'s particle `getBounds` is now plainly `renderer.getStageSize()`, no overscan.
- **Particle containers were added to `cameraContainer` before planes, so every particle rendered fully behind an opaque plane rectangle.** `SceneEffects` (which attaches all six `ParticleField` containers in its constructor) was being constructed before the plane-building loop. Pixi renders children in add-order; last-added wins the stack. Fixed by reordering `ScenePlayer.tsx`'s init effect — planes first, then `new SceneEffects(...)` — using a standalone `detectStartingTier(readNavigatorSignals())` call (the same pure, deterministic heuristic `SceneEffects`'s own `DeviceTierController` uses internally) to pick the low-tier plane cap *before* `SceneEffects` exists to ask.
- **Destroying a `ParticleContainer`'s own texture, before the renderer itself is torn down, logs Pixi's `"[BindGroup] ... was destroyed while still bound to a shader"`.** `GlParticleContainerAdaptor` caches a persistent per-container shader binding to its texture (`shader.resources.uTexture = container.texture._source`) that a plain `Sprite`'s per-frame batching doesn't — so `ParallaxPlane.destroy()`'s `{texture:true}` pattern, copied verbatim onto `ParticleField.destroy()`, warned every time a scene with active particles unmounted, confirmed by an actual e2e console listener, not assumed absent. Fixed: `ParticleField.destroy()` passes `{texture:false, textureSource:false}` — the couple of tiny (64×64/192×32) procedural textures are left for `SceneRenderer.destroy()`'s later, whole-context `removeView:true` teardown to reclaim, which happens regardless of any individual JS-side `.destroy()` call.

Beyond those five: production-appropriate particle scale/alpha values (the ones that read correctly in `dev/scene-lab` reasoning-on-paper) turned out functionally correct but visually near-imperceptible in an actual chain-on/chain-off screenshot against this specific placeholder's saturated, diagonally-hatched texture — the same class of concern M4 already flagged for handheld drift against placeholder art, now confirmed for particles too. Scales were bumped (roughly 2–3× the "reasonable" first pass) until each of the six was confirmed visible in a real screenshot, one emitter at a time, after isolating scale as the actual variable (not position, not alpha, not colour) via a bare `scale:5`/fixed-alpha/no-motion control case. `smoke`+`embers` (beat 3) are the least confidently confirmed of the six — visible in isolation during tuning, not unambiguously so in the multi-emitter beat-3 screenshot — worth another real look once painted art (M8) replaces this placeholder, since the busy hatching is likely doing a lot of the hiding.

**LUT — verified distinct, not just distinct in code:** all four presets constructed via the same `applyLutPreset(colorMatrix, key)` path, each ending in a distinct `tint`; `/dev/scene-lab`'s LUT override swaps presets live (no remount) for exactly this kind of side-by-side check.

**Screen shake — composes with drift, doesn't replace it, verified both ways:** `computeShake` unit-tested for its own amplitude bound, its higher frequency relative to `HANDHELD_DRIFT`, and that its noise shape diverges from drift's rather than being a scaled copy; e2e confirms the fire+shake beat plays with zero console errors both with and without `prefers-reduced-motion` (reduced motion forces shake `intensity` to 0 regardless of the beat's `fx`, verified via `Camera.setReducedMotion`).

**Device tiers — heuristic start, runtime monitor, manual pin, all three exercised:** `detectStartingTier`/`recordFrameSample`/`computeMedian` unit-tested directly (a brief spike doesn't trigger a downgrade; a sustained one does, after `SUSTAINED_MS`; recovery before that resets `badSince`). `selectPlanesForTier`'s "keep the 4 planes that span the full depth range" unit-tested against a 7-plane input. e2e confirms `/dev/scene-lab`'s tier override actually pins `data-device-tier`, and that this sandbox's own heuristic call (`hardwareConcurrency` reads low here) lands on `"low"` — a real, not hypothetical, exercise of the degrade path.

**Bundle — same method as M2–M4 (production build, `next start`, real gzip'd `Accept-Encoding: gzip` HTTP fetches of exactly the served `<script src>` tags, `noModule` excluded), plus a new per-module breakdown for this milestone's specific ask:**
- **Atlas: 136.6KB gzipped** (7 files) — unchanged within noise from M4's 136.4KB (43.4KB headroom against the 180KB budget). Confirms Pixi/pixi-filters stay out of the atlas bundle — M5 added nothing here.
- **Scene route initial JS: 134.9KB gzipped** (7 files, `ssr:false` still means Pixi itself isn't part of this number) — essentially unchanged from M4's 135.0KB.
- **The lazy scene engine chunk: ~134KB gzipped across 9 files** — up from M4's 71.6KB across 3. Of that ~62.7KB increase: ~2KB is `pixi-filters`' three modules bundled together (`AdvancedBloomFilter`+`GodrayFilter`+`RGBSplitFilter`, measured in an isolated esbuild bundle with `pixi.js` external: 7.1KB gzip, vs. 9.1KB summed separately — real dedup savings from bundling them together), ~5.8KB is this milestone's own hand-written code (`VignetteFilter`+`lut.ts`+`PostChain.ts`+`particles/*`+`deviceTier.ts`+`SceneEffects.ts`, same isolated-bundle method), and the remaining ~55KB doesn't isolate cleanly to any one filter or emitter — pixi.js's own `Application`-inclusive bundle already pulls in most of its shared rendering core (confirmed: importing `ParticleContainer`+`NoiseFilter`+`Filter`+`GlProgram` etc. *on top of* an `Application`-containing bundle adds only ~4.9KB marginally, in isolation), so the real-chunk delta is Turbopack's actual chunk-splitting decisions once this much more of pixi.js's API surface is reachable, not a bloated implementation on this session's part. Reported honestly as a real, not fully attributable, number rather than forcing a tidier story.
- **Time-to-first-beat, measured (not estimated), Lighthouse's "Slow 4G" profile (150ms RTT, 1.6Mbps↓/750kbps↑) via real CDP `Network.emulateNetworkConditions`, `/scene/placeholder` cold (no cache) to first canvas paint:** **3.48s** with no CPU throttle — already past the 3.0s PRD §11 budget, a number M4 never actually measured (only flagged as not captured). 4.2s at 4× CPU throttle, 4.7s at 6×.
- **Frame time under throttle, real CDP `Emulation.setCPUThrottlingRate`, beat 4 (fire+shake+godray-eligible, the busiest beat, full chain on) settled, throttled-desktop, honestly labelled (not extrapolated to mobile):** no throttle — median 16.7ms, p95 33.4ms (essentially at the 60fps/16ms line). 4× — median 33.3ms, p95 50ms (~30fps). 6× — median 33.3ms, p95 66.7ms, occasional spikes to 183ms.
- **Recommendation on the bundle-split question this session was asked to inform, not decide:** first-beat-interactive is already over its 3.0s budget even before accounting for the ~62.7KB M5 added, and that added weight is concentrated in exactly the "atmosphere" filters/emitters the user's own proposed split boundary already separates from the LUT+Vignette core. The data supports doing the split (eager: `ColorMatrixFilter`+`VignetteFilter`; deferred: `AdvancedBloom`+`Godray`+`Noise`+`RGBSplit`+all six particle emitters) — not yet implemented, per instruction to report and let the human decide.

**Reduced motion (PRD §12), verified, not just coded:** particles cap to `MINIMAL_PARTICLE_COUNT` (6) rather than disappearing entirely — "minimal," matching the spec's own wording, distinct from shake's "none at all." e2e confirms the fire+shake beat under `prefers-reduced-motion: reduce` plays with zero console errors.

**ADR 005** — hand-rolled `VignetteFilter`, following the same "small effect, no dependency worth adding" call `noise.ts`/`sweepTween.ts` already made — pixi-filters v6 (the v8-compatible line) dropped the VignetteFilter its old v3/v4 API had; `OldFilmFilter` is the nearest survivor but couples in unwanted sepia/scratches.

Next: M6 — Cutout puppets.

Update this line at the end of every session.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
