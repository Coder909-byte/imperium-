# CLAUDE.md

Conventions for this repository. Read this at the start of every session.

## What this is

**Imperium** — an interactive historical atlas. Click a region on a period map, transition through clouds into an animated cinematic scene that tells you what happened there, then take a quiz on it. Rome first; the engine must generalise to other civilisations.

Full spec: `docs/PRD.md`. Read the relevant section before starting a milestone. Don't read the whole thing every session.

## Stack

- Next.js 16 (App Router) · TypeScript strict · React 19
- **Atlas:** SVG + `d3-geo` + GSAP MorphSVG
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

Milestone: **M2 — Border morphing — complete.** `engine/atlas/MorphBorders.ts` (pure — GSAP + MorphSVGPlugin, no React/content imports): a `BorderMorph` class owning one live GSAP timeline; retained provinces morph `d` (MorphSVGPlugin auto-equalizes mismatched vertex counts by subdivision — confirmed by executing the plugin, see `MorphBorders.test.ts` and the geometry finding below), gained provinces fade+scale in from 0.96, lost fade out, all staggered (`stagger: {amount, from:"random"}`-equivalent, ~120ms spread so it doesn't scale with province count), province labels and the era label cross-fade in step. Reduced motion collapses to a flat 150ms opacity tween, no morph. Rapid clicking is safe: every `transition()` call kills the prior timeline first, so GSAP restarts from current live values instead of queueing. Insets stay an instant cut (unanimated), only the main map's fill-opacity/stroke-opacity/scale are GSAP-owned during a transition, clearing back to the `.held`/`.unheld` CSS classes on completion. Lazy-loaded via `import("./MorphBorders")`, prefetched on `requestIdleCallback` after mount — GSAP+MorphSVGPlugin never ship in the initial atlas bundle.

**Two M2 findings, both verified by running real code/builds, not by reasoning about them:**
- **Geometry:** MorphSVG handles differing vertex counts cleanly (auto-subdivides the shorter path) — no workaround needed. Today's placeholder content has one `geometry` per province across all four eras (era only gates `heldFrom`/`heldTo`, not shape), so this was verified against synthetic paths shaped like likely real data, not yet against real cross-era boundaries — re-confirm once per-era geometry is hand-authored.
- **Bundle measurement:** a `--experimental-analyze` bundle-analyzer read gave 168KB and looked like a regression; a real network capture (`next start` + `curl` with `Accept-Encoding: gzip`) of the exact scripts `/atlas` serves showed the true baseline was 133.3KB all along — the analyzer's per-module `compressed_size` fields don't sum to a real single-pass gzip. Lesson banked in CLAUDE.md's budget table. Post-GSAP, same rigorous method: initial bundle 133.9KB gzipped (+557B, just the new wiring — GSAP/MorphSVGPlugin/MorphBorders.ts confirmed absent from it), the lazy morph chunk itself measured separately at 35.6KB gzipped, fetched only on idle-prefetch/first era switch. Atlas route JS: **133.9KB gzipped** (budget 180KB).

M1 unchanged underneath: `engine/atlas/projection.ts` (pure GeoJSON→SVG via d3-geo, conic conformal, ring-winding self-correcting — see `normalizeWinding.ts`) + `AtlasFilters`/`AtlasFrame`/`AtlasInsets`. Four eras (350 BC/200 BC/117 AD/486 AD). Natural Earth 1:50m physical basemap (public domain, manifested) + 24 placeholder provinces (hand-drawn viewBox prototypes, unprojected via `tools/unproject.ts`/`unproject.cli.ts`, real geometry lands later per ADR 002). `/scene/[regionId]` stub. `engine/` still never imports `content/`. Vitest + Playwright green (10 e2e, 42 unit). Next: M3 — Cloud transition.

Update this line at the end of every session.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
