# Gallia plane tint performance — M8 remains open

## Change and acceptance

This continuation starts from clean checkpoint `75be150` (painted infantry). M8 still requires finished scene art, historical review, audible mix and pacing review, target-device/network checks and the end-to-end viewer criterion in PRD §10. This increment investigates unnecessary render work without changing art approvals, the 150 battle crowd units, five key actors, beat prose/citations or audio.

`ParallaxPlane` previously created a `ColorMatrixFilter` for every authored tint. All seven Gallia planes specify white, so each requested an identity offscreen filter pass. The installed Pixi implementation of `ColorMatrixFilter.tint()` is a diagonal RGB multiply with unchanged alpha. `Sprite.tint` performs that same multiply in the sprite batch. It now handles plane tints, including nonwhite tints; the whole-scene LUT remains a `ColorMatrixFilter` in `PostChain`. Authored blur, parallax, mirroring, visibility fades and texture ownership keep their existing paths. No new art, dependency or asset payload is added.

Two regression tests were written before the change and failed against the old implementation. They require both white and nonwhite plane tints to preserve the source texture without a tint filter. Existing tests cover placement, reveal/reduced-motion cuts and shared texture ownership.

## Reproduction and limits

Build with `npm run build`, serve with `npm run start -- --port 3002`, then run these sequentially:

```sh
node scripts/measure-scene-draws.mjs http://localhost:3002 before
node scripts/measure-scene.mjs http://localhost:3002
```

Repeat after rebuilding the changed code, using label `after` for the draw probe. The ordinary benchmark writes `test-results/m8-performance.json`; preserve each run before repeating it. Both scripts use local production HTTP and headless desktop Chrome, with 1×/4×/6× CDP CPU rates and natural device tier. They do not measure a Pixel-class GPU, Safari, 4G, audible mix or audience acceptance.

The draw probe wraps GL draw calls and framebuffer binds, introducing overhead. Its counters are submissions per sampled rAF interval, not GPU durations; do not equate its frame samples with the separate uninstrumented benchmark. The final stills use a fresh context, fixed random value for grain, reduced motion and explicit low-tier navigator signals, at 1280px and 390px. Beat 4 has no emitters. The `--stills-only` fourth argument captures those without repeating timed windows. Screenshots remain generated review artifacts under `test-results/scene-draws-{label}`, not source assets.

The ordinary benchmark retains the existing definitions: actual gzip HTTP body bytes for the exact served non-noModule script tags; fresh-context atlas click to first postrender submission; three-second battle rAF-gap windows after a three-second lead-in. Postrender is neither GPU completion nor display scanout. A 16.7ms rAF median does not pass the strict <16ms device render budget. Other host applications, thermal state and scheduler noise remain uncontrolled. Unit checks briefly overlapped the baseline benchmark's early load phase; later battle windows and the after runs have no concurrent verification jobs. Treat timing differences as samples, not isolated causal proof.

## Results

The instrumented battle probe keeps the same actor descriptor string in every before/after window (150 crowd units, five key actors), and both runs report no page errors. Natural tier is low throughout. Raw counters are in [before](reviews/m8-tint-draws-before.json) and [after](reviews/m8-tint-draws-after.json).

| Instrumented battle sample | Before | After |
|---|---:|---:|
| 1× GL draws / sampled frame | 36.28 | 31.20 |
| 1× framebuffer binds / sampled frame | 26.20 | 19.12 |
| 1× rAF median / p95 | 16.7 / 33.4ms | 16.7 / 33.4ms |
| 4× rAF median / p95 | 33.3 / 50.1ms | 16.7 / 33.4ms |
| 6× rAF median / p95 | 33.3 / 83.4ms | 16.7 / 50.0ms |

This is approximately 14% fewer GL draw submissions and 27% fewer framebuffer binds in the 1× sample, with similar counter differences at 4×/6×. These counts support reduced render work; the cadence samples alone cannot establish a device-budget pass or a stable speedup.

Fixed-seed reduced-motion before/after stills were inspected at both widths. The [pixel comparison](reviews/m8-tint-pixels.json) covers each full 844px-high page: mean absolute RGB channel delta is 0.04996 at 1280px and 0.04572 at 390px, with maximum channel delta 3/255 and zero pixels exceeding that in either image. Existing composition and alpha edges are retained within this small render/rounding difference. This comparison covers the low-tier beat-4 composition, not every animation frame or high-tier effect.

The ordinary, uninstrumented benchmark is retained in [before](reviews/m8-tint-performance-before.json) and [after](reviews/m8-tint-performance-after.json). These are single runs, each containing one three-second battle window per throttle rate, rather than repeated statistical trials.

| Uninstrumented production metric | Before | After |
|---|---:|---:|
| Atlas initial real gzip JS | 140,433 bytes | 140,433 bytes |
| Scene initial real gzip JS | 138,178 bytes | 138,178 bytes |
| Referenced scene assets | 1,026,496 bytes / 25 files | 1,026,496 bytes / 25 files |
| 1× battle rAF median / p95 | 16.8 / 33.4ms | 16.7 / 33.3ms |
| 4× battle rAF median / p95 | 16.7 / 83.3ms | 33.3 / 50.1ms |
| 6× battle rAF median / p95 | 33.2 / 83.4ms | 33.3 / 66.7ms |
| 1× fresh atlas click → postrender, three samples | 2627 / 3064 / 2586ms | 2998 / 3009 / 2833ms |
| 4× / 6× fresh atlas click → postrender | 6105 / 9164ms | 5918 / 8102ms |

The counts justify removing redundant tint passes, but the mixed uninstrumented cadence and entry results do **not** establish an overall frame-rate or loading improvement. The 4× median worsened in this run while its tail improved; unthrottled fresh entry remains around three seconds with one sample above it. The strict real-device/network budgets remain open. No extra crowd removal, effect downgrade or initialization architecture change was made to improve the numbers.

## Verification

297 unit tests across 37 files, typecheck, lint, 34-file content/rig validation and production build pass. All 34 focused Playwright checks pass across scene playback/effects, audio, Gallia prose/sources, painted personnel and rig inspectors, visual tiering and region entry. The ten-round-trip lifecycle check reports no context-exhaustion warning and +1,249,643 post-GC heap bytes, within its coarse guard; it is not a fixed-memory or real-device guarantee. Auth/database-mutating tests were excluded.

The separate final high-tier audit captured and inspected all six beats, beat 2 after the full camera move and its reduced-motion view. The report records pinned high tier, zero page errors and zero failed art responses. Artifacts: `/private/tmp/imperium-m8-tint-high`. Placeholder labels are deliberately visible only in scene-lab; the public low-tier captures contain none. Existing missing hillfort/ridge, unfinished specialist roles and provisional walls/personnel remain art-review blockers, rather than resolved assets.

`AGENTS.md` and `CLAUDE.md` remain identical and record this continuation. No commit, push, deployment, database mutation or expanded art approval was made. M8 remains open; no M9–M11 work was started.
