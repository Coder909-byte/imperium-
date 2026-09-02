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

Next: M5 — Post-processing and particles.

Update this line at the end of every session.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
