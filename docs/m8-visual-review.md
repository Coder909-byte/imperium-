# Gallia visual work — 2026-10-23

**Current reconciliation, 2026-10-23:** Current Gallia visuals/narration are owner-accepted and M8 is complete for that composition. The omissions/draft flags below remain real and are retained in [Gallia status](regions/gallia-status.md); they do not schedule another cosmetic pass. Generic launch checks are tracked in [M11](m11-launch-scope.md).

**Historical evidence follows.** Earlier “M8 open/unfinished” and old payload/readiness statements describe their checkpoint. They do not override current acceptance/status, widen asset permissions, or certify unperformed checks. Original decisions/results are preserved.

M8 remains open. This is a visual implementation/review record, not final historical or art acceptance. Existing uncommitted audio work, prose and citations were preserved. No commit, push or deployment is authorized.

## Reproduced defect

At entry, `/scene/gallia` beat 2 showed procedural hillfort and inner-wall labels against the sky. The high-tier lab also showed the ridge and foreground labels. The outer wall was correctly hidden in beat 2 and became visible in beat 3; no fallback loader substituted a placeholder for an approved historical asset. `far_ridge.webp`, `hillfort.webp`, `inner_wall.webp` and `outer_wall.webp` were absent; the foreground also had no asset. All were explicitly marked placeholders. The existing legionary and crowd art was entirely procedural.

The approved sky and ground were both wired, but the low-tier essential-plane selection omitted the ground. The natural desktop session selected low tier and fetched only the sky; forcing high fetched both. Both had HTTP 200 responses, with no page errors. The approved synthesized wind was mapped and loaded after a gesture, as were the previously integrated timber-work and cloth cues. The earlier approvals were not lost or replaced.

## Independent improvements

- Both initial low tier and runtime high-to-low downgrades now compose the two co-visible approved atmospheric images once into one background sprite, preserving ground plus hill and both walls within the unchanged four-plane cap (ADR 012). High tier retains independent sky/ground parallax.
- A new AI-assisted foreground grass/earth cut uses the already approved NGA source and existing atmospheric-edit permission. It has real alpha, an open central corridor and a separate manifest provenance row. No historical structures or figures were added through that approval.
- Procedural actor placements now sit on the painted field rather than the old placeholder band heights. The rear crowd groups were moved in front of the ground's depth so high tier does not erase them. These are staging fixes, not new costume/character art.
- Placeholder labels/bounds are an explicit scene-lab option. The public preview retains “Artwork in progress”. Scene-lab exposes per-beat plane visibility, asset paths, placeholders, draft status, procedural rigs and crowd counts. Removing labels does not constitute art completion.

## Owner-approved structure draft

The owner explicitly approved an AI-assisted provisional siege tower/rampart draft based on this exact [Motte postcard scan](https://commons.wikimedia.org/wiki/File:Motte_Le_si%C3%A8ge_d%27Al%C3%A9sia_(carte_postale_noir_et_blanc).jpg). The file page's rights statement is: “This file has been identified as being free of known restrictions under copyright law, including all related and neighboring rights.” Source scan dimensions: 3276×2144. Its own scan provenance and public-domain reproduction notice were checked on 2026-10-23; this is not a claim based solely on Motte's death date. The 1888 picture is a later interpretation, not archaeological proof.

The source is staged with its own manifest row. Historical derivatives require separate `structural-draft` approval, `ai-assisted-structure-draft` provenance and an explicitly `draft: true` structure plane. They cannot pass as final art, atmospheric art, rig parts or audio. The existing atmosphere-only approval remains insufficient for historical structures. No Alesia hill/oppidum or character permission is inferred.

## Local review

Run `npm run dev`. Open `/scene/gallia`, use the second pip for **Eighteen kilometres of wall**, then inspect all six beats. Open `/dev/scene-lab?region=gallia` for high/low, LUT, post-chain and art diagnostics. Its approved audio panel plays individual wind/cloth/chop files; the scene starts wind after a trusted gesture, timber-work on beat 2 and cloth movement on beat 6. The Mandubii beat deliberately has no one-shot cue.

For a fresh screenshot audit: `node scripts/audit-gallia-visuals.mjs http://localhost:3000 /tmp/imperium-m8-visual-after`. It captures all six beats in natural desktop, forced high and narrow views, plus beat 2 after its full camera move and under reduced motion. Before captures remain in `/tmp/imperium-m8-visual-before`. Screenshots are review artifacts, not distributable scene art.

## Remaining per-beat placeholders and omissions

| Beat | Plane placeholders still authored | Personnel treatment and missing roles |
|---|---|---|
| 1 — The hill | `gallia/hillfort.webp`, `gallia/far_ridge.webp` | Three painted provisional Roman march groups, 42 instanced figures. |
| 2 — Eighteen kilometres | `gallia/hillfort.webp`, `gallia/far_ridge.webp` | Three painted provisional Roman puppets and 32 instanced troops. Dedicated engineers/tools still absent. Inner wall provisional; outer wall correctly hidden. |
| 3 — Second wall | `gallia/hillfort.webp`, `gallia/far_ridge.webp` | 32 painted Roman and 80 painted Gallic instanced troops; both walls provisional. |
| 4 — Mandubii | `gallia/hillfort.webp` | Five painted provisional Roman guards; expelled civilian people/crowds entirely absent. |
| 5 — Two battles | `gallia/hillfort.webp`, `gallia/far_ridge.webp` | Five painted key infantry (three Roman, two Gallic), 150 painted instanced troops. Caesar, horses and flanking cavalry absent. Both walls provisional. |
| 6 — Rides out alone | `gallia/hillfort.webp`, `gallia/far_ridge.webp` | Four painted provisional Roman guards; Vercingetorix and his horse entirely absent. |

Gallia now references three painted provisional infantry rigs and their own cached four-pose crowd atlases. None of its personnel uses the old procedural legionary or generic crowd art. This does not fill the missing civilian/cavalry roles. Low tier retains the merged atmosphere plus hill/inner/outer logical layers within four physical sprites. The public unfinished-art notice remains. See `docs/m8-personnel-review.md` for the 2026-10-23 personnel increment and evidence.

The new foreground is 60,650 bytes and the shared rampart is 78,338 bytes; no duplicate payload is counted for its second placement. Total referenced payload is 851,692 bytes across seven files. Staged source scans are not shipped or counted as scene transfers.

## Exact remaining blockers

- A suitable source and preparation decision for the Alesia hill/oppidum. Motte approval covers the tower/rampart study; it does not authorize inventing hillfort details. The USMA [siege map](https://commons.wikimedia.org/wiki/File:Siege_of_Alesia,_52_BC.gif) was located as a possible future topographic reference, with a public-domain federal-work notice. It is not painted art, has not been approved/downloaded into the repo and does not establish how buildings or ramparts looked.
- A finished distant-ridge cut, civilian people/crowds for beat 4, mounted cavalry/Caesar for beat 5 and Vercingetorix/horse for beat 6. The new infantry remains provisional pending art/history review; guards do not tell the Mandubii or surrender story by themselves.
- Historical and art review of the provisional Motte wall construction, repeated/mirrored staging, straight foundation edge and missing ditch/trap detail. It is not a final engineered reconstruction. Composition/LUT/effect/pacing review against final art remains open.
- Audible mix approval and Safari/Pixel-class/network/frame-time checks, followed by the actual M8 end-to-end viewer acceptance criterion. Desktop captures and tests do not replace those checks.

Opening ember glows and battle arrow streaks were also visibly oversized in the audit. Their 64px/192px procedural textures were being scaled into large blobs/bands. Ember diameters are now about 2–4 logical pixels, arrow streaks about 23–33px long and 4–6px thick before camera scaling; a unit check uses the actual shared texture dimensions. Counts, actions, motion reduction and beat FX authoring remain unchanged.

The draft walls have explicit horizontal/vertical placement and mirroring; the two tower placements were moved 220 logical units inward after narrow captures clipped their outer edges. This does not change source geometry or claim measured siege spacing. Initial and runtime low-tier composition are both browser-tested, including a deliberately delayed requestAnimationFrame schedule to exercise degradation; that test is not a real-device performance measurement.

## Checks performed

- 289 unit tests across 35 files pass; focused plane/schema/approval/particle checks cover the changed behavior.
- Typecheck, lint, full content/rig validation (31 files) and production build pass. Engine production code still imports no content; no dependency was added.
- 26 scene/audio/Gallia browser tests passed. After the final runtime-degradation and placement refinement, all 3 focused visual tests passed, including instrumented ground composition on a deliberately slow frame schedule. This establishes behavior, not mobile performance.
- All 5 region-entry tests pass. They cover Gallia from atlas, all 23 unauthored province URLs, narrow reduced-motion keyboard return and an unknown region's 404. No auth/database-mutating tests ran.
- The initial concurrent browser audit/test run had a scene-lab readiness timeout and an early keyboard input race. Readiness waits were corrected; the clean broader rerun passed. The ten-round-trip lifecycle check from that run reported -61,805 post-GC heap bytes and no context-exhaustion warning. It is a coarse leak check, not a memory guarantee.
- Final code screenshots are captured separately under `/tmp/imperium-m8-visual-final`, including all six beats in natural desktop, forced high and narrow modes, plus beat 2 at entry, after its full camera move and under reduced motion. Earlier `/tmp/imperium-m8-visual-after` captures predate the final inward tower placement/particle sizing; use the `visual-final` set for review.
- Exact headlines, bodies and citation arrays were compared against HEAD for all six beats and remain unchanged. All pre-existing uncommitted audio work was preserved. No commit, push, deployment or database write.

Final desktop visual audit completed against the unchanged implementation: all six beats in natural low detail, forced high detail and 390px narrow view were inspected, including beat 2 entry/settled/reduced-motion captures. All three runs reported zero page errors and zero failed asset responses. The inward tower placement now keeps the beat-2 tower readable in the narrow settled frame. Contact sheets and individual screenshots are in `/tmp/imperium-m8-visual-final`; `route-beat-2-settled.png` is the primary review image. These captures still show procedural figures and missing hill/oppidum art; they do not establish a finished beat.
