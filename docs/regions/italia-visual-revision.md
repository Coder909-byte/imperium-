# Italia — spacing and distinct-setting revision, 2026-10-25

The owner reported Ariminum's infantry colliding with the civic pair, two copies of the civic pair in “Rome empties,” and repeated settings; the rest was described as good. This revision addresses those named visual issues. It does not infer acceptance of the new replacement art or close historical/device checks.

## Delivered composition

| Beat | Current backdrop / personnel |
|---|---|
| An order from Rome | New `political-hall.webp`: interpreted interior political meeting space; unnamed civic pair grounded on its floor. No claim of an identified Senate building. |
| The army he keeps | New `mustering-ground.webp`: open assembly ground, separate from the river crossing. Infantry stand in an idle pose and Caesar faces them, matching the text's address to the Thirteenth. No claim that this is the speech's proven location. |
| Across the boundary | Existing accepted-reference river backdrop/alpha bank, commander and infantry preserved. |
| Ariminum | Existing town painting preserved. Nine illustrative soldiers in three columns, at x −75 / scale .18, with 210×130 local spacing; civic pair at x 105 / scale .2. The counts are composition, not a legion strength claim. The groups no longer intersect. |
| Terms and marching orders | Existing dispatch courtyard and personnel retained. |
| Rome empties | New `rome-departure.webp`: one varied civic group painted into a distinct departure street. Both duplicated `italia_civic` instances removed. Figures are unnamed interpretations, not authenticated Pompey/consul portraits; a resident remains in a doorway rather than asserting the entire population fled. |

All six beats now have different primary backdrop files. The approved prose, linked citations, five questions, six narration files and Gallia's region/rig/binary assets are preserved. Provisional art/representation flags remain. Existing art exports were not downsized or recompressed. New Roma artwork is shifted upward 35 scene units to retain feet under the authored camera crop.

## Text-to-image relevance check

The owner asked that imagery follow the prose, rather than vary merely for variety. All six current compositions were compared directly with the approved text. The political hall supports the Senate dispute and letter; the mustering scene supports the address to the Thirteenth; the river scene supports armed troops crossing a provincial boundary; the occupied town supports Ariminum's shared result; the dispatch courtyard supports proposals/messages alongside the advance; and the departing civic group supports the leadership leaving Rome, without Caesar already being there or the entire population disappearing.

One demonstrated action mismatch was corrected: beat 2 used marching soldiers and a commander looking away. The infantry now use `idle`, and Caesar is mirrored to face the formation. This changes neither the shared rig files nor other beats. Civic figures stay unnamed: the dispatch composition does not assert a private meeting between Caesar and Cicero, and the Ariminum scene illustrates occupation rather than resolving the accounts' disputed meeting sequence. Settings, clothing and faces remain provisional interpretations; relevance is not independent archaeological verification. Approved prose, citations, quiz and narration are unchanged. The corrected address was inspected at 1440px and 390px in the isolated production preview; 47-file validation and eight relevant content/grading tests pass. [Relevance check](../reviews/italia-text-image-relevance.json). No new artwork, runtime code or database write was needed.

## Art, provenance and budget

New final exports are `public/assets/italia/political-hall.webp` (113,436 bytes), `mustering-ground.webp` (177,794) and `rome-departure.webp` (184,038), with full-resolution siblings under `content/assets/staging/italia/`. Built-in **image_gen**, not API/CLI fallback, produced these within the approved IT-A1–A5 scope and the owner's revision request. [Exact prompts, reference roles and generated output paths](../reviews/italia-visual-revision-prompts.json) are retained. References are the already downloaded, rights-verified Met images and existing generated style plates; no new external reproduction was downloaded. Manifest entries record source-file lineage, hashes, scoped grants and interpretive limits. They do not label generated output PD/CC0.

To fund the extra scenery without reducing the existing image quality, Italia uses its own `public/assets/italia/audio/wind-plains.mp3` (59,047 bytes), encoded from the approved complete 12-second CC0 wind loop. Same duration/sample rate, no authored gain or timing changes; numerical RMS is .0316288 versus source .0316228. [Encoding provenance](../reviews/italia-wind-encoding.json) records hashes, codec, decoded duration, peak/RMS and limitations. Gallia's 529,244-byte WAV is unchanged. Lossy encoding is not bit-identical or an independent audible acceptance.

Current Italia payload: **2,537,195 bytes / 23 unique referenced files**, including **1,174,371 audio bytes** and unchanged **1,098,816 narration bytes**. This leaves **84,245 bytes** below the unchanged strict 2,621,440-byte ceiling. The initial production record's 2,532,124-byte / 20-file state remains historical.

## Demonstrated renderer issue and fix

Six distinct backgrounds exposed the global low-tier selection assumption: the renderer retained only four scene planes for the whole episode, leaving the new settings black. Visual inspection caught it even though the initial ready/overflow runner returned success. [That capture is explicitly rejected](../reviews/italia-visual-revision-initial-rejected.json); it is not a pass. The runner and Italia browser checks now assert that each beat's actual backdrop is present.

[ADR 020](../adr/020-distinct-beat-settings-on-low-tier.md) records the narrow fix: retain the old global choice if every beat has scenery (including Gallia); otherwise cache each beat's selected alternatives and cap the visible set to four. Low-tier transitions cut when the cache exceeds four, preventing outgoing/incoming planes from breaking the simultaneous cap. High-tier and reduced-motion rules remain intact. Scene ownership/loading/destruction uses the existing system, with no content imports or civilisation branch. More cached texture memory is accurately documented, not counted as a physical-device pass.

## Verification and review limits

- **339 unit tests / 46 files passed**, including new missing-setting, co-visible cap and composite regressions, plus an actual-Gallia equality check against its previous low-tier selection. Existing prose/linked-citation/narration and grading checks pass.
- Typecheck, lint, **47-file content validation**, numerical rig validation and production build pass. No schema change, migration or seed was needed for this visual revision.
- All six final beats captured and inspected at pinned high/low on development, plus desktop and 390px reduced motion on the production build. Every main backdrop is present; no recorded page errors, failed responses or horizontal overflow. [Tier report](../reviews/italia-visual-revision-tiers.json), [production report](../reviews/italia-visual-revision-production.json). Local captures: `/private/tmp/imperium-italia-visual-revision-approved-layout` and `/private/tmp/imperium-italia-visual-revision-production`.
- The new wind encoding passes real-browser decoding, current-voice/loop cleanup, rapid beat navigation and persisted independent-control checks. [Browser result](../reviews/italia-revised-wind-browser.json). The earlier complete six-recording autoplay evidence remains valid for the unchanged narration; it is not relabelled as a new full listening review.
- The same control/cleanup scenario passes again **1/1 on the final rebuilt renderer**: [final audio check](../reviews/italia-visual-revision-final-audio.json).
- Ariminum's entry, middle and settled camera positions were captured/inspected at **1440px and 390px with normal motion**. The infantry and civic pair remain separate through the entire move, with no horizontal overflow. [Spacing capture record](../reviews/italia-ariminum-spacing.json); images remain in `/private/tmp/imperium-ariminum-spacing`.
- Production scene regression: all **four Italia scenarios pass**, including desktop/narrow source drawers and actual backdrop assertions. The initial combined run was **5/6**: Gallia's first test hit its existing five-second canvas-ready deadline under concurrent render load. Running Gallia alone, with no further code change, passes **2/2**. [Initial result](../reviews/italia-visual-revision-initial-browser.json), [Gallia rerun](../reviews/italia-visual-revision-gallia-rerun.json). These cover six distinct scene scenarios across runs; overlapping checks are not added together.
- The final build's **51 browser chunks contain zero authored private quiz explanation/feedback strings**, and actual atlas gzip script transfer remains **144,602 bytes**. [Transfer/privacy result](../reviews/italia-visual-revision-transfer-privacy.json). Neither is a phone/4G performance claim.

Review at **http://127.0.0.1:3006/scene/italia**, the explicitly isolated production preview. Normal auth-enabled development remains **http://localhost:3000**, unchanged. All automated scene-progress requests are intercepted; no quiz/signup mutation, shared DB write, commit, push, deploy or M11 work is part of this revision. The existing [IT-H1–H5 history/representation limits](italia-status.md) and physical-phone/Safari/GPU/4G/listening limits remain open. The owner can review the new visual replacements without reopening approved prose or Gallia.
