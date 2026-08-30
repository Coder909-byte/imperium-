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

Milestone: **M3 — Cloud transition — complete.** `engine/transition/CloudSweep.tsx` — CSS/SVG, not the PRD's original WebGL (see ADR 004): two translated `<div>` masses with a static `feTurbulence`+`feDisplacementMap` filter on the mass container (same technique as `AtlasFilters.tsx`'s `inkEdges`) plus 14 filter-free gradient-circle puffs for parallax, all driven by writing `transform`/`opacity` to refs from a dependency-free `requestAnimationFrame` tween (`sweepTween.ts`) — no GSAP, this overlay has to be ready on the very first click with no idle-prefetch grace period, so it ships eager. `transitionStore.ts` (Zustand, first real use of it — ~636B gzip) lets `AtlasMap`'s province click and the scene's `BackToAtlasButton` both reach the one `CloudSweep` instance mounted in `app/layout.tsx`, which survives the actual atlas↔scene DOM swap. Timing: ~820ms in (ease-out, decelerating into the meet) / ≥250ms hold, extended dynamically until `usePathname()` confirms the destination has actually rendered (a `router.push()` doesn't hand back a "done" promise) / ~950ms out (ease-in, accelerating apart). Reduced motion: flat 200ms opacity cross-fade, no cloud shapes rendered at all. Interrupt-safe like M2's `BorderMorph`: one shared `ProgressTween` always continues from its current live value, plus an owning-run-id guard so a superseded sweep's later phases never fire; a real browser-back mid-sweep (`popstate`, which the app doesn't otherwise get advance notice of) snaps to full occlusion fast (120ms) rather than racing an 820ms sweep against Next's own re-render — e2e-verified, not just reasoned about.

**M3 findings, verified against real Chrome traces and a real build, not assumed:**
- **Hydration bugs, caught by the dev overlay, not guessed.** `Math.random()` in puff generation and a `matchMedia`-based lazy `useState` initializer both ran once during SSR and again during client hydration with different results — the second one picked between structurally different subtrees (masses/puffs vs. the reduced-motion crossfade), a real mismatch. Fixed: puffs generate `useEffect`-only, post-mount (starts `[]`, safe because nothing's visible at occlusion 0 anyway); `reducedMotion` moved to `useSyncExternalStore` with a server snapshot of `false` — the React-native fix for exactly this "value differs between server and client" shape, not a manual effect.
- **The "static filter, motion via compositor-only properties" claim (ADR 004) holds — confirmed via a real Chrome trace with per-node attribution, not the isolated synthetic probe I checked it with first.** Every mass and puff paints exactly once, on first appearance, never again. A lower-than-expected first fps reading turned out to be a confound, not clouds: mouse clicks unavoidably hover first, and hovering an atlas province already triggered a full-`#document` repaint via the pre-existing (M1/M2) `.hovered` CSS transition inside `inkEdges`'s filtered `<g>` — unrelated to CloudSweep, filed as a separate open item rather than fixed here (out of "cloud transition only" scope). Isolated from that: ~55fps at 1× CPU, ~48fps at 4×, ~43fps at 6× throttle (median frame gap ≈17ms even at 6×) — real numbers, but desktop Chromium under CPU throttling only; mobile GPU compositing and Safari's (historically less compositor-friendly) handling of referenced SVG filters remain unverified, no device/Safari access here. Open item, not proof.
- **Bundle, same rigorous method as M2** (`next start` + `curl`, gzip, `noModule` excluded): atlas route JS **135.9KB gzipped** (+2.0KB over M2's 133.9KB baseline — CloudSweep + Zustand shipped eager, confirmed cheap enough that eager was the right call). 44.1KB headroom left against the 180KB budget.
- **CLS: measured 0**, via a real `PerformanceObserver({type:"layout-shift"})` across a full atlas→scene sweep, not inferred from `position:fixed`.

M1/M2 unchanged underneath: `engine/atlas/projection.ts` (d3-geo) + `MorphBorders.ts` (GSAP MorphSVGPlugin, lazy-loaded) + `AtlasMap`/`AtlasFrame`/`AtlasInsets`/`AtlasFilters`. Four eras (350 BC/200 BC/117 AD/486 AD). Natural Earth basemap + 24 placeholder provinces (real geometry lands later per ADR 002). `/scene/[regionId]` stub, now with a working back-to-atlas link. `engine/` still never imports `content/`. Vitest + Playwright green (15 e2e, 60 unit). Next: M4 — Scene engine core.

Update this line at the end of every session.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
