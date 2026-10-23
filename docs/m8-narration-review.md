# Gallia narration — M8 scope addition, 2026-10-23

## Owner request and sample decision

The owner requested a deep, clear, restrained documentary voice reading the existing six beat bodies verbatim, with ambience quietly underneath. No paid API, real-person clone, account-dependent shipping path or inference from free access to distribution rights is allowed. Text, reduced-motion rendering, prose, citations and approved artwork stay available. This adds narration to M8, not M9/M10; see ADR 015 and PRD §8.3/§10.

One 9.85-second sample was generated first, using the opening two sentences of the Mandubii body, stock `bm_george`, speed .92. It was not audible to the owner through the initial chat attachment, so `/dev/narration` was added with an ordinary audio player and its verbatim transcript. The WAV's decode/playback was verified in Chrome. The owner then said “looks good to me lets do this”, authorizing the six full recordings with that voice and pace. The sample stays in staging with its own manifest row; it is not a partial replacement for beat 4. The sample route/API are development-only and return 404 in production.

## Licence investigation and chosen path

| Component | Verified primary source | Decision/limit |
|---|---|---|
| `kokoro-js` 1.2.1 | [Publisher source](https://github.com/hexgrad/kokoro/tree/main/kokoro.js), Apache-2.0 `LICENSE` inside the exact [npm archive](https://registry.npmjs.org/kokoro-js/-/kokoro-js-1.2.1.tgz) | Free local generation; no service/API fee or account. Temporary preparation package, absent from app dependencies. |
| Kokoro v1.0 weights | [Original publisher model card](https://huggingface.co/hexgrad/Kokoro-82M), [exact ONNX conversion model card](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/blob/1939ad2a8e416c0acfeecc08a694d14ef25f2231/README.md) | Both declare Apache-2.0; original publisher explicitly permits production deployment. Full generation pins ONNX revision `1939ad2a8e416c0acfeecc08a694d14ef25f2231`, q8, local WebAssembly CPU inference. No hosted inference call. |
| Stock `bm_george` voice | [Publisher voice list](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md), [specific binary in pinned Apache-2.0 ONNX repository](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/blob/1939ad2a8e416c0acfeecc08a694d14ef25f2231/voices/bm_george.bin) | Same binary as the reviewed npm voice: SHA-256 `c4b235a4c1f2cd3b939fed08b899ce9385638b763f7b73a59616c4fc9bd6c9bc`, confirmed by downloading both. Stock British male voice; no real-person reference recording, impersonation request, fine-tuning or cloning step. Voice-package/model grants are Apache-2.0; no separate PD/CC0 claim is made. |
| Browser runtime | [Transformers.js licence](https://github.com/huggingface/transformers.js/blob/main/LICENSE), [phonemizer.js](https://github.com/xenova/phonemizer.js), [eSpeak NG licence](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING) | Transformers.js and phonemizer wrapper declare Apache-2.0; underlying eSpeak NG is GPL-3.0. Used locally to prepare phonemes, not shipped as a site runtime. |
| MP3 encoding | [SoundFile BSD licence](https://github.com/bastibe/python-soundfile/blob/master/LICENSE), [libsndfile LGPL-2.1](https://github.com/libsndfile/libsndfile/blob/master/COPYING), [LAME's LGPL terms](https://lame.sourceforge.io/license.txt) | Temporary Python SoundFile 0.13.1 / libsndfile 1.2.2 encode mono 24kHz MP3. Tool binaries are not distributed with the site. LGPL §0 distinguishes running the tool from library-derived output. |

The permissive model/voice grants and actual account-free local execution support this chosen preparation/distribution path; this is not a conclusion based on a free web demo. Tool/model licences do not assign a public-domain status to generated recordings, guarantee every training-data/right-of-personality question, or establish historical pronunciation accuracy. Output provenance and owner authorization are recorded separately as `Generated stock-voice narration` with `generated-narration` approval. That branch cannot authorize scenery, characters, ambience or cues. Ordinary art/ambience/cues retain their PD/CC0 rule. This is the explicitly requested scoped narration exception, not a blanket relaxation.

The initial Python `kokoro-onnx` 0.6.1 route was tried in an isolated temporary environment. Pip found no compatible ONNX Runtime wheel for this macOS 12.7.6 / x86_64 / Python 3.13 combination. No OS upgrade, paid service or unverified system voice was substituted. The publisher's browser WebAssembly package worked on the same Mac. Models and preparation packages remain outside the repository.

## Reproduction and content identity

Extract the reviewed `kokoro-js` npm archive outside the repository. With Chrome available, run:

```sh
node scripts/generate-gallia-narration.mjs /private/tmp/imperium-tts-js/package /private/tmp/imperium-gallia-narration
/private/tmp/imperium-tts-venv/bin/python scripts/encode-gallia-narration.py /private/tmp/imperium-gallia-narration
```

The temporary Python environment needs `soundfile==0.13.1`; no application dependency is added. Full generation is authorized only after sample review; these commands generate all six. The generator pins model revision, voice binary/hash and speed. It uses a closed sentence stream, verifies complete sentence reconstruction against each original `beat.body`, and rejects over-context phoneme sequences instead of accepting truncation. A string-stream helper in this package left its final sentence waiting indefinitely in the first full attempt; explicit finite-stream closure corrected it before any production recording was installed.

Each sentence uses the same voice and speed, with 150ms between sentences. Mono PCM WAV intermediates remain temporary. MP3 encoding uses VBR compression level .5, targeting .12 RMS with a .95 source-peak ceiling for consistent levels. The sample is the original 24kHz float32 WAV; it is not relabelled or regenerated silently. Codec grants are separate from voice/model provenance.

Each production recording has a manifest row with exact source links, stock voice hash, model revision, transcript, transcript SHA-256 and duration. CI compares every narration hash to its unchanged body and generated provenance; editing prose requires a matching new recording. Sentence/token checks establish input identity and absence of context truncation, not an independent word-by-word transcription of the output. Final human pronunciation and listening review remains useful, especially ancient names.

## Playback contract

- No narration or ambience is constructed/fetched before a trusted scene gesture. Button-click activation bubbles after navigation handlers, so an initial next-beat click cannot briefly start the previous voice. Arrow navigation applies the new beat before activation.
- `AudioDirector` retains scene-local ownership. Its `NarrationTrack` has one disposable Howl per beat visit. Synchronous beat subscriptions stop/unload the previous one before replacement; generation guards reject old play/end/error callbacks, including after re-entry. Exit stops narration immediately before route/cloud changes.
- Narration/ambience each have an independent persisted switch, alongside the retained master mute. Master mute and narration-off cancel narration; explicit re-enable starts only the current beat from its beginning. Ambience-off leaves narration running. Background beds and one-shot cues use .18 of their authored gain while narration loads/plays, returning to authored gains when narration ends.
- Autoplay can be enabled during speech and waits for its actual `end`, then holds one second. It stops after the last beat. Missing, disabled, master-muted, failed or stalled narration gets a fresh reading dwell: `max(7s, words/3.2 + 2.5s)`. An eight-second startup watchdog and duration-plus-five-second playing watchdog prevent indefinite suspension if loading/end events are lost. Disabling autoplay never lets a later end event advance the beat.
- Full text, citations and controls remain visible. Reduced motion still cuts camera/reveals and disables drift/parallax; it does not hide prose or force audio. Dwell-mode camera travel covers the longer of authored motion, reading dwell and declared narration duration.

## Payload and verification

Before narration: 1,026,496 referenced bytes / 25 files, including 555,122 audio bytes. After integration: **2,124,928 referenced bytes / 31 files**, including **1,653,554 audio bytes** of which **1,098,432 are narration**. This leaves **496,512 bytes** under the strict <2.5 MiB total ceiling. The six recordings total 209.6 seconds. Staging sample/intermediates are excluded from shipped-region accounting; the original sample is a 945,644-byte float32 WAV, and full WAV intermediates stay outside the repository.

| Beat | Duration | MP3 bytes |
|---|---:|---:|
| The hill | 35.625s | 193,872 |
| Eighteen kilometres of wall | 33.900s | 172,008 |
| Then a second wall, facing outward | 40.425s | 205,680 |
| The Mandubii | 34.900s | 183,192 |
| Two battles in one day | 34.425s | 185,088 |
| He rides out alone | 30.325s | 158,592 |

[Generation/encoding ledger](reviews/m8-narration-generation.json) records each complete sentence, token count, source/output hash, duration and gain. Maximum sentence context is 189 tokens, below the 510-token limit. `npm run validate` prints narration/audio bytes as well as total unique referenced bytes and retains the unchanged strict total-budget failure. All six original bodies, headlines, citation arrays, actors, effects and plane definitions were compared to HEAD and remain unchanged.

Final verification: **311 unit tests across 39 files**, typecheck, lint, 34-file content/rig/transcript validation and the final production build pass. **37 distinct focused browser checks** pass across narration, audio, Gallia prose/sources, visual tiering, general scene playback/effects and region entry, including all six real MP3 decode/play checks, maximum one narrator, cancellation/re-entry, true end-led autoplay and failure fallback. Auth/database-mutating tests were excluded. The ten-round-trip lifecycle guard reports no context-exhaustion warning and +1,023,196 post-GC heap bytes; this is a coarse desktop check, not a fixed-memory claim.

The initial wider run exposed a synthetic fixture's `route.fetch()` response-disposal race on a polling request during teardown. The fixture now uses isolated imported data and passes. A later stress run caught a React pre-mount warning while a source edit triggered development refresh; the unchanged isolated stress rerun passed with zero console errors, without suppressing diagnostics. No inference of a production regression or a device acceptance pass is made from that refresh-contaminated run.

Production HTTP confirms `/dev/narration` and `/api/dev/narration-sample` both return **404**. [Exact production gzip transfers](reviews/m8-narration-production.json): atlas initial JS **140,433 bytes**, scene initial JS **138,177 bytes**, using deduplicated served script tags and excluding noModule. The generator/model are absent from shipped runtime dependencies; no new application dependency was added. These are initial-script/payload checks, not a new 4G timing or mobile GPU measurement.

Final production desktop 1280px and 390px reduced-motion captures of beats 1 and 5 were inspected with narration playing. Both report zero page errors/failed art or audio responses, full captions and reachable controls, and no horizontal overflow. Artifacts: `/private/tmp/imperium-m8-narration-final`. The original sample continues to play at `/dev/narration` on the local dev server. PRD, handoff and identical AGENTS/CLAUDE files record the scope addition and remaining gates.

The owner approved the voice sample and generation; complete listening/mix/pronunciation and target-device review remain distinct from these functional checks. M8's missing art and historical/device gates remain open. No M9–M11 work, commit, push, deployment or database mutation was made.
