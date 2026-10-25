# Original M0–M11 plan before status reconciliation

Historical plan text, including its acceptance targets. Checkmarks in this old text do not certify external checks. [Current status](../project-status.md) separates implementation, owner acceptance and launch verification. IDs and the M1.5 addition are retained.

## 10. Build plan

One milestone per Claude Code session. Do not start a milestone until the previous acceptance criteria pass.

**M0 — Foundation** *(~1 day)*
Next.js 15 + TS + Drizzle + Neon + Better Auth. Email/password and Google. Protected `/profile`. Vitest + Playwright. CI runs typecheck, lint, test.
✅ Sign up, log in, log out, session survives refresh. CI green on a PR.

**M1 — Atlas** *(~3 days)*
Historical GeoJSON → `d3-geo` → SVG paths. Four eras. Inset switcher with swap. Parchment filters, ornate frame, cartouche, city and sea labels. Region hover and click.
✅ All four eras render; inset click swaps with main; region click routes to `/scene/[id]`.

**M1.5 — Focused shell pass** *(owner-authorized 2026-10-23, undertaken after current Gallia experience review)*
Landing, login/signup and existing profile shell only: monumental licensed artwork, parchment/oxblood/charcoal, self-hosted inscription-style Cinzel, shared navigation and form states. Atlas/scenes stay public; Gallia is the sole available flagship, quiz/progress remain planned. Preserve Better Auth email/password, Google and redirects without configuration changes. Verify desktop/mobile renderings, keyboard/focus/contrast/reduced motion, navigation, read-only or mocked auth contracts, tests and production performance. New shell artwork requires specific rights/provenance and owner approval, separate from Gallia permissions. No other region or remaining M11 launch work. Owner refinement: make the landing painting the dominant full-width composition behind the masthead, using white highlights and the image’s shadow colours; retain the approved account/profile treatment.
✅ Implemented and locally verified: actual responsive pages/screenshots, working entry/navigation, honest availability and preserved auth/Gallia. 314 unit tests, 21 focused browser checks, typecheck/lint/validation/final build pass. See `docs/m1-5-shell-review.md` for approved Cole/Royer reproductions, Cinzel OFL, measured production performance and auth/device limits. Historical/device gates remain independent of owner satisfaction with current Gallia visuals/narration.

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
`tools/forge` CLI, one pipeline: load → optional crop/resize → colour-space normalise → export WebP, colour intact (ADR 003's default). `--matte` gates a desaturate → level → luminance-to-alpha stage onto the same pipeline instead — an explicit flag, never the default, scoped to cutout character parts and foreground silhouettes. Batch mode processes a directory of already-separated Photopea layers in one command, uniform flags across the whole folder. Every processed file gets a `content/assets/manifest.json` row (source, licence, artist, institution, the settings used); the command refuses to write one — no output file either — if `--source`/`--licence`/`--artist`/`--institution` aren't supplied (`--artist`/`--institution` accept an explicit `"unknown"`, never a silent default). `npm run forge -- ./raw/gerome-01.jpg --source ... --licence ... --artist ... --institution ...` (colour plane) or the same with `--matte` (character/silhouette source). See `docs/art-pipeline.md` for the full sourcing → rights-check → Photopea → forge workflow.
✅ A raw painting scan becomes a game-ready colour plane in one command; a folder of already-separated layers becomes a batch of them; `--matte` produces a clean alpha matte for a character/silhouette source; every processed file gets a manifest row, and a missing licence field refuses the write rather than leaving one blank.

**M8 — Gallia to the ceiling** *(owner-accepted 2026-10-23; outstanding evidence checks retained)*
Six beats, real painted planes, puppet actors, Gallia ambient beds and required cues, all effects. The reference implementation. M8 also owns the minimum reusable Howler foundation: user-gesture activation, bed crossfades/intensity, one-shot cues, persisted master mute and scene-exit cleanup (ADR 009). Ambient beds/cues retain the human-approved, manifest-listed PD/CC0 boundary. Owner-approved generated stock-voice narration has its own reviewed code/model/voice provenance and scoped approval, without claiming PD/CC0 output status (ADR 015).

**Narration scope added 2026-10-23:** one consistent deep, clear, restrained documentary voice reads each existing `beat.body` verbatim; headlines/year and full text remain visible. Investigate zero-cost local generation and verify exact tool/model/stock-voice licences first; prepare a short listening sample before generating six recordings. No paid API, account-dependent shipping path, real-person clone or inference from free access to distribution rights. The owner approved the George sample and full generation in this session. Narration uses the existing Howler foundation, starts only after a trusted gesture, cancels synchronously on beat change/exit and never overlaps an old beat. Separate persisted narration/ambience switches accompany master mute; ambience/cues stay quiet underneath narration. Autoplay waits for actual narration completion plus one second; missing/disabled/muted/failed/stalled narration uses reading-time fallback. Loading/end watchdogs, stale-callback protection, manifest entries, verbatim transcript hashes and narration/audio/total size accounting are required. The strict <2.5 MiB region limit and reduced-motion behaviour remain unchanged. The owner explicitly accepts the current Gallia experience and atlas visuals on 2026-10-23 and authorizes M9. This is owner acceptance of M8, not a pass of the outstanding independent history, specialist art, full listening/mix/pacing or real-device/browser/network checks.
✅ Someone who has never seen the project watches end to end without touching their phone.

**M9 — Quiz and progression** *(owner-accepted 2026-10-23; unresolved verification/deployment checks retained)*
Question bank schema and seeding. Server-side grading. Per-option quip UI. XP, rank, streaks. Anonymous → account progress migration.
✅ Answer key never appears in any network response before submission. Verified in Playwright against an isolated database and in all production browser chunks. Five Gallia questions, transactional first-correct XP, provisional ranks, UTC streaks and verified guest import are implemented. See `docs/m9-quiz-review.md` for recorded checks, trust policy and shared-database deployment boundary.

**M10 — Audio** *(current Gallia implementation/local audit complete, 2026-10-23; phone/listening checks open)*
Audit the current Gallia narration, ambience and cues against the foundation delivered in M8 (ADRs 009/015); verify controls, persistence, gesture activation, crossfades, narration-led autoplay, reading fallback, rapid navigation, failure handling, cleanup, provenance and download budgets. Fix demonstrated issues only. The owner’s current authorization does not expand to additional content or rebuild working systems. Final phone/browser and listening checks remain separate evidence gates.
✅ Current Gallia passes 330 unit tests, 12 focused audio browser checks, the complete six-recording production autoplay and all six desktop/narrow rendering checks. No runtime change was needed. Actual phone/Safari playback and full listening/mix/pronunciation judgement remain unverified. See `docs/m10-audio-review.md`; no catalog expansion is claimed.

**M11 — Shell and launch** *(not started; remaining scope audited 2026-10-23)*
Landing/auth/profile and the atlas makeover are already delivered and must be preserved. Remaining: OG/sharing metadata and sitemap/robots; analytics/error-monitoring setup; launch-wide accessibility/mobile/Lighthouse/performance acceptance; approved-environment auth/database/deployment checks. `docs/m11-launch-scope.md` records the exact remaining work and observed PRD gaps (Read as text, completion wreaths, scene resume), service-account constraints and the separate Gallia-first versus twelve-region catalog decision. No M11 implementation is authorized by the M10 audit.
✅ Lighthouse ≥90 performance and accessibility on non-scene routes. Full flow works on mid-range Android.

---

