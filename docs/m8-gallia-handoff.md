# M8 Gallia handoff — 2026-10-22

M8 is **in progress, not complete**. Worktree was clean at handoff. `AGENTS.md` was missing and was copied from `CLAUDE.md`; their rules and current-state text remain synchronized. No commits, pushes, deployments or database mutations were performed by this agent. HEAD advanced externally from `d9f2a52` to `6ba38bb` (`takeover`) during the session; that checkpoint was preserved.

## Verified starting state and scope

M0–M7 code is present, including the atlas/transition, scene engine, post chain, particles, procedural legionary, rig inspector/linter and forge. Earlier completion reports are historical records, not proof of current real-device acceptance. The repository already contained six Gallia beats, not the one beat described in the older M4 note. All six bodies, headlines and citations were preserved verbatim. The sole painted WebP is a forge example unrelated to Alesia; no Gallia plane, real puppet part or audio file exists in the manifest.

Implemented in M8: cross-reference validation, explicit placeholders, approved image/audio references, scene-owned image loading and cancellation cleanup, real texture support in the scene and rig inspector, sources drawer, accessible narrow-screen captions, reading-time camera travel and independent layer reveals. Actors use coordinates authored against a 1280px-wide scene, scaled to the current width. Real plane textures preserve their aspect ratio when covering the stage. Howler foundation includes gesture gating, crossfades/intensity, one-shot cues, persisted mute and exit cleanup (ADR 009).

Not implemented here: M9 quiz work or M11 launch work. M10 retains broader audio polish/expansion; its minimum reusable foundation moved to M8 by the owner's explicit decision.

## Pacing before cutting art

| Beat | Reading dwell | Previous camera duration | M8 camera |
|---|---:|---:|---|
| The hill | 25.938s | 9s | At least reading dwell, linear |
| Eighteen kilometres of wall | 24.375s | 21s | At least reading dwell, linear |
| Then a second wall | 27.500s | 24s | At least reading dwell, linear |
| The Mandubii | 26.563s | 24s | At least reading dwell, linear |
| Two battles in one day | 26.875s | 22s | At least reading dwell, linear |
| He rides out alone | 21.563s | 19s | At least reading dwell, linear |

Total reading dwell is 152.813s. The first camera previously stopped about 17s before its dwell elapsed. `durationMode: "dwell"` takes the maximum of authored duration and the unchanged prose-based formula. Linear easing avoids long deceleration tails. This is a content opt-in, not a new global reading speed. A manually held beat eventually reaches its target and retains handheld drift; autoplay enabled partway through a beat starts a fresh reading timer, while the camera retains its beat-entry timing. The first layer set is visible immediately; later visibility changes take 600ms instead of the entire 19–24s camera duration. Reduced motion cuts camera/reveals and holds actors at rest.

Review `/scene/gallia` with autoplay, and `/dev/scene-lab` with Gallia selected, high/low tiers and the post chain on/off. Unit checks validate pacing math; screenshots establish readability and staging, not audience engagement or a final art judgement. Review source drawers both open and closed. Crowd silhouettes still use one generic procedural four-frame march atlas; they are not real Gallic or Roman costume art.

## Plane cutting brief

Use one registered **2520×1080** scene canvas (21:9) for every layer. Preserve transparent canvas area; do not tightly crop backdrop layers. Export PNGs at source size, then forge. Far planes can downscale to 1440px wide (~617px high); others to 1920px (~823px high). Runtime adds 1.35× coverage and uses centered pivots. Keep enough painted/clone-stamped margin for the authored pans and 0.86–1.32 camera scale range. Verify edges across the complete motion after cutting; do not assume margins from a still image.

| Required name / future asset ref | Depth | Intended content and beat use | Suggested forged width |
|---|---:|---|---:|
| `gallia/sky.webp` | .02 | Overcast base, all six beats; full opaque sky | 1440 |
| `gallia/far_ridge.webp` | .18 | Distant relief approach; absent in Mandubii beat | 1440 |
| `gallia/hillfort.webp` | .30 | Alesia/hill silhouette, all beats | 1920 |
| `gallia/mid_ground.webp` | .42 | Open ground and corridor; all beats | 1920 |
| `gallia/inner_wall.webp` | .52 | Circumvallation; beats 2–6 | 1920 |
| `gallia/outer_wall.webp` | .68 | Outward-facing contravallation; beats 3–6 | 1920 |
| `gallia/foreground.webp` | .90 | Near silhouettes; beats 1–3 and 5 | 1920 |

Low tier retains the four authored essential planes: sky, hillfort, inner wall and outer wall. The previous evenly spaced choice dropped the outer wall entirely. The cap remains four.

Only `sky` should be fully opaque. Other planes need intentional alpha silhouettes/holes to avoid occluding deeper planes. Backdrops remain full colour; white `tint` and the scene's `cold_overcast` LUT do the grading. Beat 6 declares `lightSource: true`; a visible light source in that composition needs your judgement. Godrays must not imply an unpainted light source. Check smoke/embers against final colours and the intensity of the battle shake. The single Alma-Tadema sample is not an Alesia backdrop.

## Rig cutting and staging brief

Only `legionary` exists. It has idle/march/brace/thrust/fall/raise and passes the numerical linter. Do not duplicate its rig and call it historically approved cavalry/Gallic/civilian art. Gallia currently stages every army with this procedural rig or the same generic crowd atlas. Counts are compositional samples, not troop totals.

For the existing rig, export separate parts at these exact logical pixel sizes/pivots, or update size, pivot, rest offsets and animation together after a proportional rescale. Coordinates are measured from each image's top-left; keep overlap at joints. The loader uses real image dimensions, so a large export cannot simply inherit the old small-pixel pivots.

| Part | Size (w×h) | Pivot (x,y) |
|---|---|---|
| pelvis | 70×50 | 35,50 |
| chest | 70×70 | 35,70 |
| head | 50×50 | 25,50 |
| upperArm_L / upperArm_R | 18×55 | 9,0 |
| forearm_L / forearm_R | 16×50 | 8,0 |
| thigh_L / thigh_R | 22×60 | 11,0 |
| shin_L / shin_R | 18×55 | 9,0 |
| foot_L / foot_R | 26×12 | 9,0 |

Future part refs: `gallia/legionary/<part-id>.webp`, one manifest entry each. Keep matte RGB white for runtime tinting. Existing clips are kinematic previews, not confirmation that a new silhouette has clean joints or correct period equipment.

Remaining roles needing art/composition judgement:

- `gaul_warrior`: relief attackers in beats 3 and 5; needs a distinct silhouette/costume and corresponding crowd frames. Pose layout and pivots await source cuts.
- `civilian`: the expelled Mandubii in beat 4. Existing legionary guards do not illustrate the expelled people. Decide how to imply the atrocity without depicting gore or inventing documentary likenesses.
- `cavalry`: Caesar's flanking action in beat 5 and Vercingetorix's surrender in beat 6. No horse or rider hierarchy/assets exist; dimensions/pivots must follow the selected source, not guessed human-limb values.
- `standard_bearer` and `auxiliary`: listed in the PRD's v1 library and earlier handoff's five remaining rigs, but no specific Gallia placement is authored. Decide whether they are needed for flagship acceptance before making cuts. This session does not silently redefine the v1 library as mandatory in every scene.

For new rigs, declare locomotion, symmetry pairs and intentional midline exemptions; run `npm run validate` (includes `lintRig`) and inspect every clip and pivot overlay in `/dev/scene-lab` → Rig inspector. The linter checks continuity, reach, midline crossing, ground contact and symmetry; it cannot approve a costume, anatomy or horse gait by itself. Real approved puppet part loading works in both scene and inspector. Real crowd-frame production/replacement still needs to accompany approved source art; crowds currently ignore costume differences.

## Audio assets and decisions

`wind_plains` is the existing scene bed ID, with intensities .35, .45, .50, .15, .85, .25. It is explicitly a placeholder. No cue names or cue assets are currently authored. Select a quiet seamless wind/plains loop; judge battle ambience/cues for beat 5 and whether beat 6 needs a cue or deliberate quiet. These are sound-design proposals, not approved assets or committed historical sounds. Do not substitute music or synthetic effects without approval.

Place approved files under `public/assets/gallia/audio/`, map their logical IDs in `scene.audioAssets`, and set optional `beat.audio.bed` or `beat.audio.cue`. Set `audioPlaceholder: false` once mappings are complete. Audio formats supported by the boundary are MP3, OGG and WAV; budget their actual transferred bytes along with art. Howler starts only on a scene-local trusted gesture, including the mute control. Mute persists as `imperium:audio-muted`; disabled storage falls back to the current mounted state. Exit stops/unloads audio before the cloud sweep finishes. Audible crossfades, cue timing, mobile Safari/Chrome unlocking and the mix remain unverified with real files.

## Rights review and forge commands

No new production art/audio was downloaded, generated or approved. No approval was added to the production manifest. Synthetic browser fixtures and their synthetic approval records exist only in test memory.

The existing scan's [specific Commons file page](https://commons.wikimedia.org/wiki/File:The_Roses_of_Heliogabalus.jpg#Licensing) was retrieved on 2026-10-22. Its exact rights statement is: **“This file has been identified as being free of known restrictions under copyright law, including all related and neighboring rights.”** The page labels it **“Public domain”**, using the Public Domain Mark; it also describes jurisdictional limits on reuse of reproductions. This differs from the older M7 notes calling it a Met/CC0 image. The listed source is a magazine/exhibition reproduction, and the collection is private. Treat the old Met/CC0 description as unverified, not as permission. The current manifest's public-domain label has not been promoted to human approval. The painting remains unrelated to Gallia and unused.

For every selected Gallia source, retrieve the specific file/institution's exact rights statement and URL for the owner to review. A painter's death date, a search result or this agent's licence summary is not approval. Do not use CC BY-SA pixels in composited planes. Keep pending files outside `public/`; forge records provenance even for staging files:

```sh
# One source per batch: do not attach one painting's licence to mixed sources.
npm run forge -- ./raw/gallia/backdrops-near \
  --source "$GALLIA_SOURCE_URL" --licence "$GALLIA_LICENCE" \
  --artist "$GALLIA_ARTIST" --institution "$GALLIA_INSTITUTION" \
  --resize 1920 --quality 78 --out-dir content/assets/staging/gallia

npm run forge -- ./raw/gallia/backdrops-far \
  --source "$GALLIA_SOURCE_URL" --licence "$GALLIA_LICENCE" \
  --artist "$GALLIA_ARTIST" --institution "$GALLIA_INSTITUTION" \
  --resize 1440 --quality 75 --out-dir content/assets/staging/gallia

# Parts already cut at their exact rig dimensions: no blanket --resize.
npm run forge -- ./raw/gallia/legionary-parts \
  --source "$LEGIONARY_SOURCE_URL" --licence "$LEGIONARY_LICENCE" \
  --artist "$LEGIONARY_ARTIST" --institution "$LEGIONARY_INSTITUTION" \
  --matte --quality 82 --out-dir content/assets/staging/gallia/legionary
```

Those variables stand for reviewed source values, not supplied defaults. Forge is an image pipeline, not an audio converter. Audio needs a manifest entry when it enters the repo, with its exact source/rights too.

After human review, rerun the appropriate forge command with `--out-dir public/assets/gallia` (or its `legionary` subdirectory), retaining source filenames matching the refs above. Add the owner's `approval: { by, at, rightsUrl, rightsStatement }` to each production manifest row. Normalize `licence` to `Public domain` or `CC0` and preserve the exact statement separately. Update plane refs/rig textures, turn off their placeholder flags, and validate. The manifest row's `file` is repo-relative (`public/assets/...`); content refs omit that prefix (`gallia/...`). Do not approve files on the owner's behalf. Recheck the total region payload, including all referenced puppet parts and audio; seven full-width colour planes may exhaust the unchanged 2.5MB budget before audio.

## Remaining acceptance gates

- Human pacing/engagement review of all six beats, then final-art composition/LUT/effects review.
- Seven appropriate painted planes, actual costume/character art and needed crowd frames, with specific reproduction rights and human approval.
- Approved audio files, cue selection and audible mix review.
- Independent history review. In particular review the unqualified eighty-thousand and sixty-thousand claims, the Mandubii inference/wording, cavalry chronology, Caesar's cloak/flanking staging and surrender/execution sources. This session preserved the final prose rather than silently rewriting it. Existing Plutarch/Dio labels have no URLs, and the Caesar links identify a work rather than a precise section URL. Schema/link presence is not fact checking.
- Pixel 6a-class GPU/frame time, real mobile network first-beat timing, Safari playback/filters, orientation/resize behaviour and reduced-motion judgement against final art. Desktop CPU throttle is only a proxy.
- No evidence yet justifies cloud-window Pixi initialization against real Gallia art. Keep ADR 004's architecture; revisit after real texture payload/upload measurements.

## Checks and measured results

- `npm run test`: **271 tests passed across 33 files** (255 at entry). This includes actual Gallia content/reference checks, strict total-payload boundary, numerical rig tests, camera timing, texture ownership and audio lifecycle checks.
- `npm run typecheck`, `npm run lint`, `npm run validate`, `npm run build`: passed. Validate checks 31 content files, runs numerical rig lint and measures unique referenced assets. Current Gallia external asset payload is **0 bytes / 0 files** because every image and sound is missing or procedural, not because final art fits the budget. The strict region limit remains **<2.5×1024² bytes**, consistent with the forge's existing binary-KB convention.
- Scene-only Playwright: **22 passed** (`npm run test:e2e -- e2e/gallia.spec.ts e2e/scene.spec.ts --workers=1`). Covers six captions/sources, narrow reduced-motion access, persisted mute, synthetic approved image/audio loading, no pre-gesture audio request, failed-image text access, inspector, effects and lifecycle. Auth/database-mutating e2e tests were excluded. The final ten-trip WebGL check reported no context-exhaustion warning and 348,449 bytes of post-GC heap growth; this is a coarse lifecycle check, not proof of a fixed memory footprint.
- All six beat screenshots were inspected. A production screenshot pair at first-frame and 20 seconds shows the opening camera still changing framing well after the old 9s move would have stopped. This is a pacing preview, not the PRD's audience-engagement acceptance test.

Production method: `npm run build`, `npm run start -- --port 3002`, then `node scripts/measure-scene.mjs http://localhost:3002`. The script fetches exactly the served non-`noModule` script tags using real gzip HTTP transfers and records CDP CPU-throttle/rAF samples and the repository's User Timing marks. Raw output and screenshot pairs are under ignored `test-results/`; rerunning Playwright may clear that directory.

Final recorded run: **2026-10-22 13:31 IST**, headless desktop Chrome 150 on macOS, local production server, no mobile/4G network simulation, procedural Gallia art and no approved audio. Each frame sample is a 3-second window on the battle beat, after a fresh navigation and 3-second lead-in. The player's actual tier was **low** in all three windows, so these numbers do not validate the full seven-plane filter load.

| Measurement | Result |
|---|---|
| Atlas initial route JS, real gzip | 139,897 bytes = 136.62 KiB (7 chunks; under 180KB budget) |
| Gallia initial route JS, real gzip | 138,179 bytes = 134.94 KiB (7 chunks; lazy engine/audio excluded from initial script tags) |
| Unthrottled navigation → first-frame marker, 3 runs | 822.7 / 1161.1 / 578.8ms |
| Unthrottled Pixi init in those runs | 160.8 / 125.9 / 154.8ms |
| Unthrottled image/graph phase in those runs | 25.4 / 14.6 / 13.2ms (all procedural) |
| 4× / 6× navigation → first-frame marker | 689.6 / 880.5ms (single samples, warm caches) |
| Battle rAF interval, 1× median / p95 / max | 16.7 / 33.4 / 33.4ms |
| Battle rAF interval, 4× median / p95 / max | 16.7 / 33.4 / 83.3ms |
| Battle rAF interval, 6× median / p95 / max | 16.7 / 50.0 / 66.6ms |

An earlier local run had 4×/6× medians of 33.3ms, demonstrating real run-to-run variation; do not cherry-pick the final run as a stable mobile result. rAF intervals include display scheduling and dropped frames, not isolated GPU render duration. A 16.7ms median is not a pass of a strict <16ms budget. The first-frame mark is the repository's ticker boundary, not a measurement of display scanout or a real 4G interactive time. The previous M5 0.8–1.1s init floor did not reproduce in this environment; that does not invalidate its old measurements. Nothing here warrants changing cloud-window initialization before real Gallia image-transfer/upload measurements.
