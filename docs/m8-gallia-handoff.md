# M8 Gallia handoff — 2026-10-22

### Narration scope and integration — 2026-10-23

The owner added narration to M8 and approved the 9.85-second stock George listening sample before requesting all six recordings. Gallia now references six locally generated, verbatim-body MP3s using the same Apache-2.0 Kokoro/stock-voice package, pinned model revision and .92 speed. No paid API, account or real-person cloning was used. Generated recordings have separate provenance and scoped `generated-narration` approval; they are not labelled PD/CC0. ADR 015 and `docs/m8-narration-review.md` record licences, approval, preparation and verification limits. Original prose/citations/art remain preserved.

The existing Howler foundation owns a single cancellable narrator, separate persisted narration/ambience switches and master mute, quiet ducked ambience/cues, narration-end-led autoplay and reading-time fallback. All six recordings total 209.6 seconds and 1,098,432 bytes. Region payload is **2,124,928 bytes / 31 files**, including 1,653,554 audio bytes, within the unchanged strict <2.5 MiB ceiling. Transcript hashes and generated metadata are CI-validated. Open `/scene/gallia` and activate sound; `/dev/narration` retains the approved sample player in development only. M8 remains open for missing art, complete listening/mix/pacing, history and Safari/Pixel-class/network acceptance.

### Painted personnel continuation — 2026-10-23

M8 remains open. The owner explicitly approved provisional AI-assisted Roman/Gallic infantry references, transparent rig parts and shared crowd atlases. Museum/scholarly equipment evidence and limits, the exact Met source image rights, generated provenance and scoped character approval are separate in the manifest and docs/m8-personnel-review.md (ADR 014). No Imperial segmented armour, rectangular scutum or default shirtless Gallic army was introduced; costumes, faces and colours remain interpretive, subject to historical review.

The white figures were intentional procedural parts, not failed image loads or a tint fault. Gallia now uses three painted provisional cutout rigs (Roman, ochre-clothed Gaul, blue-clothed Gaul), six connected assemblies each, with restrained animation and corrected ground placement. All six military beats use them. Four-pose atlases are baked from the same approved textures once per rig/action and shared by instanced CrowdFields, with independently seeded phases and authored irregular rows. Beat 5 retains 150 crowd units and five key actors across both fronts; an authored opening camera frame keeps the foreground attackers in view during reading-time travel. The inspector accepts safe underscored rig IDs and fits painted bounds/pivot overlays rather than assuming a hip origin.

Unique referenced payload: **1,026,496 bytes / 25 files**, up **174,804 bytes**. Four cached crowd atlases over the full visit add runtime texture memory, without extra network files. All new art is provisional and never labelled public domain. Existing approved sky/ground/foreground, Motte wall studies, synthesized wind and Kenney cues remain integrated. Final headlines, bodies and source arrays are unchanged. Pre-existing work is preserved; HEAD is externally at 05575a0 (m8 advance 2); this agent did not commit or push.

Verified: **295 unit tests / 37 files**, typecheck, lint, 34-file content validation with rig lint, and production build pass. 26 scene/audio/personnel checks passed, then 8 inspector/region-entry checks passed after fixing the inspector issues (including all 23 unauthored province URLs and keyboard/narrow Coming soon access). Initial inspector checks exposed the underscored-ID defect; the corrected checks and all three painted rigs' six clips pass. The ten-round-trip lifecycle check reported -60,177 post-GC heap bytes with no context exhaustion warning. These are desktop functional checks, not final device or art acceptance. Production before/after method and final captures are recorded in docs/m8-personnel-review.md.

Desktop production before/after: scene payload +174,804 bytes; atlas/scene initial gzip JS effectively unchanged. Final battle rAF medians are 33.3ms at 1×/4×/6× (baseline 16.7/33.4/33.4ms), with p95 33.4/33.4/66.7ms. Six compatible crowd render containers retain all 150 units; batching did not improve measured median cadence. Fresh unthrottled atlas-entry samples are 3041/3069/2616ms; strict device/network timing acceptance is open. Full raw runs, limits and comparison are in docs/m8-personnel-review.md. Final six-beat desktop high/low/narrow audit has no page errors or failed art responses.

Remaining: hillfort in all beats; ridge in 1–3/5–6; dedicated engineer/tool art in 2; expelled civilians/crowds in 4; Caesar/horse/flanking cavalry in 5; Vercingetorix/horse in 6. Walls and infantry still need final art/history review. Listening/mix, human end-to-end pacing, Safari/Pixel-class GPU and network acceptance are open. Do not call beat 2 or M8 complete, or start M9–M11.

### Visual continuation — 2026-10-23

Preserved all existing uncommitted work, final beat prose and citations. Reproduced beat 2 in Chrome: missing historical files were explicit placeholders, not failed approved-image loads. The previously approved AI-assisted `sky.webp`/`mid_ground.webp`, synthesized `wind-plains.wav` and two Kenney cues were integrated. Low tier incorrectly excluded the painted ground; it now composes the co-visible approved sky/ground into one transient sprite alongside the hill and both walls within the unchanged four-plane cap (ADR 012). High tier keeps independent parallax.

Prepared `foreground.webp` from the approved NGA atmospheric source with imagegen and forge, with alpha and provenance. The owner then explicitly approved a provisional AI-assisted tower/rampart draft based on the specific Motte postcard scan, with its exact public-domain reproduction statement reviewed. `siege-rampart-draft.webp` is wired as two distinct plane placements: inner wall from beat 2, mirrored/lowered outer wall from beat 3. Both carry `draft: true` and a separate `structural-draft` approval branch; no atmospheric permission was expanded implicitly, no generated pixels were labelled public domain, and no final historical approval was claimed. This permission does not cover an invented Alesia hillfort or figures.

Public canvas developer labels/bounds are disabled; scene-lab alone draws them and exposes art diagnostics. The public “Artwork in progress” notice remains. Actor prototypes now stand on the painted ground/corridor. Oversized ember glows and arrow streaks were reduced to actual spark/projectile sizes. Existing region-entry fixes were audited: authored Gallia loads, all 23 unauthored provinces have intentional named Coming soon responses with no player, narrow reduced-motion keyboard return works, unknown region is 404. No route fix was needed in this continuation.

**Still incomplete:** `gallia/hillfort.webp` in every beat; `gallia/far_ridge.webp` in beats 1–3/5–6 (omitted by low tier); all 13 legionary part textures and the generic crowd atlas remain procedural. Mandubii civilians (beat 4), distinct Gallic relief figures/crowds (beats 3/5), cavalry and surrender rider (beats 5/6) are absent. The two walls are provisional source-based studies, not approved final art; detailed ditches/traps, edge blending and historical construction still need authored/reviewed art. Do not call beat 2 complete merely because labels are gone. Shared scene payload is **851,692 bytes / 7 files**, excluding staging originals/procedural art. Full asset/beat inventory, local review URLs, screenshots and limitations are in `docs/m8-visual-review.md`. M8 remains open; do not start M9–M11. No commit or push.

Verification for the visual continuation: **289 unit tests (35 files), typecheck, lint, 31-file content validation and production build pass.** The 26-test scene/audio/Gallia suite passed before the final runtime/placement refinement; all 3 focused visual tests then passed against that refinement, including an actual high-to-low transition with canvas-bake instrumentation. The 5 region-entry tests also passed (all 23 unauthored province URLs, authored atlas entry, keyboard/narrow reduced motion and unknown-ID 404). Initial concurrent screenshot/test execution exposed readiness races; checks now wait for engine readiness and the final screenshot audit runs separately. This is not a timing-budget pass. Final referenced payload remains 851,692 bytes / 7 files. Existing audio changes and all six prose/citation records remain preserved; no commit or push.

Final visual audit: all six beats captured/inspected in desktop low, forced high and 390px narrow views; beat 2 also checked after the full camera move and with reduced motion. Zero page errors or failed asset responses in all three runs. Final screenshots: `/tmp/imperium-m8-visual-final`. Beat 2 remains incomplete because its hillfort and actors are still placeholders; wall art remains provisional.

### Continuation — 2026-10-23

Resumed from clean checkpoint `06f67dc` (`before limit`). That checkpoint is ahead of the original handoff below: two owner-approved AI-assisted atmospheric planes (`sky` and `mid_ground`) and the approved synthesized wind loop are already integrated; approved Kenney cues are on disk. The atlas availability and viewport registration fixes are also present (ADRs 010/011). The original 2026-10-22 measurements below describe the earlier procedural scene, not this checkpoint.

Completed the approved audio increment: mapped `timber_work` to the unchanged Kenney chop file in beat 2 and `cloth_movement` to the unchanged cloth file in beat 6. Added optional validated `audio.cueVolume` (0–1; playback defaults to 1 for existing content); Gallia uses provisional gains .18 and .12. Cues play once on beat entry after activation, stop on beat change/mute/exit, and do not replay on unmute. The Mandubii beat has no cue. The wind bed and its six intensity values are unchanged. No new asset or rights approval was added.

Gallia now references **712,704 bytes across 5 unique files**, below the unchanged strict 2.5 MiB ceiling. This covers two atmospheric planes, wind and two cues, not finished historical art. Five planes and all character/crowd art remain procedural; low tier still prioritizes the sky plus placeholder hill and two walls, so it does not display the painted mid-ground. Final composition, listening/mix approval, independent historical review and real device/network acceptance remain open. M8 remains incomplete; do not start M9–M11.

Verified this continuation: **283 unit tests across 35 files; 24 scene/audio/Gallia Playwright tests; typecheck, lint, content validation (31 files) and production build pass.** Real OGG cues decode/play in desktop Chrome; activation, muted-entry suppression, no stale cue on unmute, failed-bed recovery, exit cleanup, narrow reduced-motion prose and ten WebGL round trips pass. The lifecycle check reported +532,319 post-GC heap bytes, with no context-exhaustion warning; this is not a real-device performance or listening approval. Two old synthetic browser fixtures needed their inherited production planes/cues isolated after the earlier art integration; the corrected fixtures pass. AGENTS.md and CLAUDE.md remain identical. No commit, push, deployment, database mutation or new licence approval was made.

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
