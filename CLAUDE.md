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
4. **Ordinary source assets require verified public-domain or CC0 rights.** Artist death dates are not proof; the specific scan's rights status is. Existing owner-authorized atmospheric/structural/personnel derivatives (ADRs 012–014) and generated narration (ADR 015) have separate, narrow manifest approval/provenance paths; generated files are never labelled PD/CC0. Narration also requires verified tool/model/voice grants and transcript provenance. Accepted Gallia assets retain their actual draft/scope flags. New-region use or generation does not inherit blanket approval from the source licence or accepted Gallia experience.
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
- Handheld camera noise (~0.4Hz, 3–6px translate, 0.2° rotate) runs permanently in scenes. The implemented seeded value noise is the recorded departure from the original Perlin target. It is not optional polish; it is most of the perceived quality.
- Scene backdrop planes are full-colour painted art (PRD §3) — never strip colour at the asset level. Cross-source consistency comes from the per-scene LUT via `ColorMatrixFilter` in the post chain, not from monochrome-with-alpha assets. Alpha-from-luminance is still used, but scoped to cutout character parts and foreground silhouettes, where a clean matte matters more than colour fidelity.
- Distant crowds are instanced quads on a shared texture, never individual puppet rigs.
- Detect low-end devices and degrade: at most four rendered planes (alternative settings may be cached; ADR 020), halved particles, no godrays or chromatic aberration. A stuttering scene is worse than a static image.

## Performance budgets

Enforced. Do not merge work that breaks these.

| Metric | Budget |
|---|---|
| Atlas TTI | < 2.0s on 4G |
| Scene first beat interactive | < 3.0s |
| Scene frame time | < 16ms on Pixel 6a class |
| Scene assets per region | < 2.5MB |
| Atlas route JS | < 180KB gzipped |

**How "Atlas route JS" is measured** (settled M2, after an initial mismeasurement — see M2 in the preserved milestone history): `npm run build`, then `npm run start`, then real HTTP requests with `Accept-Encoding: gzip` against exactly the `<script src>` tags the served `/atlas` HTML contains, summing real transferred (`Content-Length`) bytes. Excludes the `noModule` legacy-polyfill chunk — real target devices (Pixel 6a class, evergreen browsers) never fetch it, so counting it measures bytes no user transfers. Don't substitute a bundle-analyzer's per-module `compressed_size` field for this — module-level compression estimates don't reflect a single real gzip pass and overstate the true figure (confirmed the hard way in M2: apparent 168KB that a real network capture showed was actually 133KB).

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

- **One authorized workstream per session.** Preserve M0–M11 and the existing M1.5 addition. The owner prioritizes a second playable Roman region ahead of M11. Separate implemented/local verification, owner acceptance and external launch checks; see `docs/project-status.md` and ADR 019. Do not reopen accepted Gallia for cosmetic work or turn an unverified launch check into a pass.
- Before writing code for a milestone, restate the acceptance criteria and outline the approach. Wait for confirmation on anything ambiguous.
- Write the test alongside the feature, not after.
- When a decision from PRD §17 gets made, write a short ADR in `docs/adr/NNN-title.md`: context, decision, consequences. Three paragraphs is plenty.
- If something in the PRD turns out to be wrong or impossible, say so and propose an alternative. Don't silently work around it.

## Current state — reconciled 2026-10-23; Italia production 2026-10-25; Italia continuation 2026-10-25

The repository wins over old summaries. [Project status](docs/project-status.md) is the current milestone/evidence record; the former detailed log is preserved verbatim in [history](docs/history/2026-10-23-milestone-record.md). Dated M8 “unfinished/do not start M9” statements in that archive and older ADR/review snapshots are historical, superseded for current sequencing by the owner's acceptances and ADR 019.

| Milestone | Current delivery / acceptance |
|---|---|
| M0 | Foundation implemented/local checks recorded; real provider/release checks belong to M11. |
| M1 | Atlas complete; later relief/viewport/navigation/availability redesign delivered and owner-accepted. |
| M1.5 | Landing/auth/profile shell makeover delivered, locally verified and owner-accepted; real profile progress/history subsequently delivered by M9. |
| M2 | Border morphing implemented/local checks recorded. |
| M3 | CSS/SVG cloud transition implemented/local checks recorded. |
| M4 | Scene core implemented/local checks recorded. |
| M5 | Post-processing/particles/device-tier path implemented/local checks recorded. |
| M6 | Puppet solver, rig lint/inspector and instanced/painted-rig crowds implemented/local checks recorded. |
| M7 | Forge/manifest/asset validation implemented/local checks recorded. |
| M8 | **Complete for the current owner-accepted Gallia visuals/narration**, including expanded scoped art, painted personnel and narration. Known representation/historical limits stay in the region record. |
| M9 | **Quiz/progression complete and Gallia quiz owner-accepted.** |
| M10 | **Implementation/local audio audit complete.** Existing M8 systems retained; no runtime rebuild needed. |
| M11 | **Partially delivered**, with accepted shell/profile/atlas work, scoped accessibility, basic metadata/guards and CI already present. Remaining launch checklist is deferred behind region two. |

**Recorded evidence, not invented new passes:** 330 unit tests/44 files, typecheck/lint/39-file content validation/build, 18/18 M9 production browser checks, 12/12 M10 audio checks, full six-recording production autoplay/cleanup and desktop/narrow captures. Gallia references **2,124,928 bytes/31 files** (audio 1,653,554; narration 1,098,432); atlas actual gzip scripts **144,590 bytes**. Review reports document environment/limits. Gallia-checkpoint inventory: 24 province files, one authored campaign, two Test fixtures, five questions, four rigs (three painted drafts plus procedural `legionary`). No phone/Safari/GPU/4G/Lighthouse/live-Google/shared-target pass is inferred.

**Owner acceptance is settled:** Gallia's current visuals/narration and quiz, redesigned landing/auth/profile shell and realistic relief atlas UI. Do not keep a pending taste-approval task for these same current experiences. [Gallia status](docs/regions/gallia-status.md) retains specific holding-date/ancient-claim/representation questions and accepted art omissions. [M11](docs/m11-launch-scope.md) owns genuine cross-cutting launch checks. Asset permission scopes remain unchanged.

**Current workstream: Italia / the Rubicon crisis, ahead of M11.** The owner approved the six-beat outline/endpoint, exact prose for narration/quiz, and IT-A1–A5 art/use scopes on 2026-10-25. Seven painted planes providing six distinct settings, provisional Caesar/civic tableau rigs, permitted Roman infantry/wind/cloth reuse, six new George recordings and five questions are integrated. No hatched development art remains. This production authorization is not final Italia experience/listening/quiz acceptance or independent historical certification. [Italia status](docs/regions/italia-status.md), [production evidence](docs/regions/italia-production-review.md) and [the checklist](docs/region-completion-checklist.md) govern completion. Preserve the approved prose/linked citations and actual interpretive/provisional flags; no Gallia cosmetic reopening, blanket new-region grants or speculative engine work.

Owner follow-up: Ariminum's army/civic overlap and duplicated Rome figures/backdrop required correction; the rest was described as good. The revision spaces Ariminum's groups, replaces Rome with a distinct painted departure scene and gives beats 1/2 their own hall/mustering settings. Preserve all approved prose, citations, quiz and narration. [ADR 020](docs/adr/020-distinct-beat-settings-on-low-tier.md) records the demonstrated low-tier blank-background fix, unchanged Gallia selection and cached-versus-rendered distinction. [Visual revision review](docs/regions/italia-visual-revision.md) owns the new evidence and remaining review limits.

Use safe synthetic/isolated local DB configuration for mutating tests; never fall back to shared `.env.local`. Earlier migration/seed checks were isolated. Actual shared/deployed schema/seed/provider state is unverified in this reconciliation; inspect the approved target before any separately authorized write. Do not commit, push, deploy, mutate shared data or start M11 launch work under this task. Existing work and Gallia's accepted experience must be preserved.

Current references: [PRD](docs/PRD.md), [ADR 019](docs/adr/019-milestone-acceptance-and-region-workstreams.md), [shell](docs/m1-5-shell-review.md), [atlas](docs/atlas-ui-review.md), [M8](docs/m8-gallia-handoff.md), [M9](docs/m9-quiz-review.md), [M10](docs/m10-audio-review.md). Old preview port/process notes are historical; inspect active processes before promising a preview is running.

Next: review the delivered Italia experience and retain external checks accurately. Current inventory: 24 provinces, two authored playable campaigns, 22 unauthored provinces, two Test fixtures, ten questions and six rigs. Italia references 2,537,195 bytes/23 files (audio 1,174,371; narration 1,098,816), under 2.5 MiB; Gallia remains 2,124,928 bytes/31 files. Fresh visual-revision checks: 339 unit tests/46 files, 47-file validation, typecheck/lint/build; exact browser reruns/privacy/audio/render evidence are in the production review. Atlas actual gzip scripts: 144,602 bytes/7 scripts. No phone/Safari/GPU/4G/live-Google/shared-target pass is inferred.

Normal auth-enabled development remains **http://localhost:3000**, with `.env.local`/auth configuration unchanged. **http://127.0.0.1:3006** is an explicitly isolated production review using synthetic auth values and disposable local Postgres `imperium_m9_test_italia` on port 55439; only that database received existing migrations, ten question seed rows and test writes. The previous no-DB prose preview on 3008 is retired. The normal/shared environment's Italia seed is unverified and unchanged; use the isolated preview for complete quiz/signup tests. Inspect active processes before promising any preview persists. Update current status and keep AGENTS/CLAUDE identical; preserve dated history/evidence.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
