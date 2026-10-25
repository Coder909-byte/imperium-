# M10 — Existing Gallia audio audit, 2026-10-23

The owner tested Gallia's quiz and accepts M9's current behaviour. This records owner acceptance while retaining unresolved shared-Neon migration/seed, live Google-provider and actual-device checks. M10 was authorized only to audit and finish the audio already delivered in M8. M11's launch remainder was not started; its shell/profile/atlas portions were already delivered through earlier work.

## Scope and result

ADRs 009 and 015 moved the reusable Howler foundation and narration into M8. The current PRD also describes later catalog expansion; this session's explicit owner instruction narrows M10 to the existing six-beat Gallia experience. No new region, track, sound engine, asset or mix change is needed merely to fill the milestone.

The existing implementation passes the local lifecycle checks below. No runtime defect has been demonstrated, so `AudioDirector`, `NarrationTrack`, `useSceneAudio`, `BeatDirector`, player controls, content and audio files are preserved. Work here adds targeted browser instrumentation/coverage and records the audit. The scoped M10 implementation and desktop audit are complete; final production autoplay/render evidence is recorded below. The owner accepts the current narration/visual experience. Actual phone/browser launch acceptance remains unverified and is tracked in M11; local tests do not claim independent word-for-word transcription or phonetic certification.

## Existing behavior verified

| Requirement | Evidence |
|---|---|
| Six narration recordings | Actual MP3s decode and play singly on all six beats. Transcript hashes bind each recording to its unchanged final beat body. Existing generation/encoding ledger and output hashes match. |
| Ambience/cues | One looping wind bed remains owned by the scene; every beat applies its authored intensity. The timber cue belongs to beat 2, cloth to beat 6; beat 4 intentionally has no cue. Real OGG cue durations/playback are checked. |
| Separate controls | Narration-off cancels voice while the bed continues; ambience-off leaves voice running and silences ambience/cues. Master mute cancels voice/cues and silences owned ambience. Re-enable starts only the current voice; unmute does not replay a stale cue. |
| Persistence | All three localStorage preferences restore after reload, including simultaneous master mute/narration-off/ambience-off. Unmuting does not override the two independent choices. |
| Trusted activation | No scene audio fetch/play occurs before trusted input. Programmatic button clicks do not activate sound; trusted pointer and keyboard controls use the current beat. |
| Crossfades/ducking | Existing 600ms fades apply authored bed intensity. Synthetic routing fixtures using real WebAudio verify two-bed overlap only during the crossfade, settling to one bed and canceling stale stops on rapid return. Actual Gallia has one shared bed and fades its intensity. While narration loads/plays, beds/cues use 0.18 of their authored gains; per-beat gain values are measured in the browser. |
| Narration-led autoplay | Existing unit/browser checks use the current voice's actual end plus one second. Disabling autoplay prevents a later end event from advancing. The final real six-recording run checks completion through the final beat. |
| Reading fallback | Missing, muted, disabled or failed narration gets a fresh `max(7s, words/3.2 + 2.5s)` dwell. Unit tests cover the exact timer paths. The failed-recording browser check now waits through the full reading interval and verifies the next beat, rather than checking only the initial failure state. |
| Slow/stalled/failed audio | Delayed old narration never speaks after replacement/re-entry. Startup and lost-end watchdogs cancel stalled voices. Real recording 503 → explicit narration toggle retry recovers with one voice. Failed-bed reload recovers only after an explicit sound toggle. A delayed wind download plus rapid navigation starts only one loop. |
| Replay/navigation/cleanup | Revisiting a beat replaces its voice. Master mute, narration toggle, Escape, scene exit, quiz navigation, back navigation and destruction release/cancel the appropriate owned playback. Returning to the scene requires a fresh trusted gesture. Unit tests verify canceled timers and idempotent unload, with no global Howler unload/mute. |

## Beat levels and assets

These authored values are unchanged. The ducked gain is a numerical playback check, not a judgement about loudness on phone speakers.

| Beat | Voice duration | Wind gain | Wind under narration | Cue / authored gain |
|---|---:|---:|---:|---|
| The hill | 35.625s | .35 | .063 | — |
| Eighteen kilometres of wall | 33.900s | .45 | .081 | timber / .18 |
| Then a second wall, facing outward | 40.425s | .50 | .090 | — |
| The Mandubii | 34.900s | .15 | .027 | — |
| Two battles in one day | 34.425s | .85 | .153 | — |
| He rides out alone | 30.325s | .25 | .045 | cloth / .12 |

All nine production audio files have manifest source URLs, rights statements, dated owner approvals and matching SHA-256 output hashes. All six narration files also match the encoding ledger, duration metadata and transcript hashes. Generated narration is never labelled PD/CC0 and retains its separate `generated-narration` approval, pinned Kokoro revision, stock voice binary hash and tool/model grants. No generation tool/model is shipped as an app dependency.

Primary source labels were rechecked on 2026-10-23: [Luke.RUSTLTD's synthesized wind](https://opengameart.org/content/wind1) and [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio) declare CC0; the [pinned Kokoro ONNX model card](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/raw/1939ad2a8e416c0acfeecc08a694d14ef25f2231/README.md) declares Apache-2.0. The specific tool/model/stock voice review and generated-output authorization remain documented separately in ADR 015 and `docs/m8-narration-review.md`. No new licence/asset approval is inferred.

- Narration: **1,098,432 bytes / 209.6 seconds / six MP3s**.
- All audio: **1,653,554 bytes / nine files**.
- Full referenced Gallia payload: **2,124,928 bytes / 31 files**, leaving **496,512 bytes** below the unchanged strict 2.5 MiB ceiling.
- Wind: 529,244 bytes; original/procedural preparation provenance and seam/level numbers remain in its manifest notes. The two Kenney cues are unchanged official archive members.

See [asset identity report](reviews/m10-audio-assets.json). Staging samples and temporary source/PCM files are not counted as shipped scene downloads. No new production asset or application dependency was added.

## Checks and reproduction

- **330 unit tests / 44 files** pass, including AudioDirector, NarrationTrack, BeatDirector and dwell tests.
- Typecheck, lint, **39-file** content/rig/transcript validation and final production build pass.
- **12 focused browser checks** pass: existing audio (2), narration (5) and new lifecycle/gain/persistence/crossfade checks (5). These use system Chrome 150 on macOS, with real production assets plus isolated in-memory failure/crossfade fixtures. No authenticated context, account creation, migration, seed or shared-database mutation was used. New lifecycle checks explicitly intercept progress POSTs.
- **Complete production autoplay** runs all six real recordings to their actual ends, advances after each end/hold and stops autoplay at beat 6. One wind loop starts across the full visit; exactly the two authored cues play (0.24025s / 0.66102s). Exiting leaves **zero active audio sources**.
- **Twelve production captures** cover all six beats at 1440px normal motion and 390px reduced motion, with two additional exit checks. All were inspected: full prose and the three separate audio controls remain reachable in document flow, with no horizontal overflow, page errors or failed responses. Every playing-beat sample has one narrator/one bed and the expected ducked gain. Each fresh browser context downloads exactly **nine unique audio files / 1,653,554 response-body bytes**, matching the shipped audio budget. [Production report](reviews/m10-production-audio.json); screenshots: `/tmp/imperium-m10-audio/beat-{1..6}-{1440,390}.png`.
- [Focused browser record](reviews/m10-browser-tests.json) preserves the final 12/12 pass. Existing narration/audio unit coverage remains green; tests now prove actual reading-time advancement, persisted independent controls and real crossfade/cleanup behavior.
- `git diff --check` passes; AGENTS/CLAUDE remain identical. Runtime engine/app/auth/content/assets/dependencies/database schema are unchanged. The pre-existing staged M9 testing documents are preserved.

Commands:

```sh
npm run test
npm run typecheck
npm run lint
npm run validate
npm run build
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/audio-lifecycle.spec.ts e2e/audio.spec.ts e2e/narration.spec.ts --workers=1
node --import tsx scripts/audit-scene-audio.mjs http://127.0.0.1:3006 /tmp/imperium-m10-audio
```

The browser suite uses development fixture/sample routes, so run it against the local dev server. The standalone audit uses only the real public production scene and intercepts progress writes; the local port-3006 preview retains the isolated test database configuration. Its desktop pass waits for actual audio completion; its 390px pass visits all six beats with reduced motion. Output and screenshots are local diagnostics, not new shipped assets.

## Accepted experience and remaining verification ownership

The owner explicitly accepts Gallia's current narration and visuals. There is no pending taste-approval task for that same baseline and no cosmetic Gallia work is scheduled. Local playback/hash tests do not independently transcribe every spoken word or certify historical pronunciation; that evidence limit is retained without calling M8/M10 unfinished.

Cross-cutting Android/Pixel-class/Safari/iOS audio unlock, speaker/headphone behavior, foreground/background playback, networking/GPU budgets, launch-wide accessibility and approved-environment/provider checks now live in [M11's unchecked list](m11-launch-scope.md). They have not been marked passed. Specific Gallia holding-date/ancient-claim/interpretive-art questions and accepted omissions live in [Gallia status](regions/gallia-status.md).

The local M10 implementation/audit is complete. [Project status](project-status.md) records M11 as partially delivered, with its remaining launch work deferred behind the owner's next priority of region two. No commit, push, deployment or shared-database write was performed by the audio audit or this reconciliation.
