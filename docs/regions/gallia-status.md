# Gallia — accepted current baseline

**Status, 2026-10-23:** implemented and locally verified; current visuals/narration and working quiz are explicitly accepted by the owner. M8/M9 are complete for this accepted baseline, and M10 implementation/local audit is complete. The next priority is a second region, not Gallia cosmetic refinement. This record is not an archaeological reconstruction certificate or a phone/GPU test pass.

## What is actually present

`content/regions/gallia.json` contains six final prose/citation beats about Alesia in 52 BC. The region uses approved painted sky/ground/foreground, a separately approved provisional Motte-derived rampart study in two placements, three provisional painted infantry rigs and their own cached crowd poses. All six beats have approved George narration; wind and the beat-2/beat-6 Kenney cues are integrated. Five source-grounded questions, per-option feedback and server-side grading/progression are implemented and accepted. Public scene and quiz entry remain available without an account.

Keep the final prose, citations, scene composition, audio settings and accepted shell/atlas behavior unchanged in this workstream. Asset flags/permissions are independent of subjective acceptance: provisional/generated files remain labelled as such, and approval of the experience does not broaden them into final archaeological art or another region's assets.

The current region references **2,124,928 bytes / 31 files**. Earlier reviews' 0/712,704/851,692/1,026,496-byte inventories describe prior checkpoints. The original procedural `legionary` rig remains a development fixture; Gallia uses the painted `roman_infantry`, `gaul_warrior` and `gaul_warrior_blue` rigs.

## Specific history/representation register

These remain accurately documented. They are not permission to silently rewrite the accepted scene or manufacture new art. Resolve factual changes through a scoped historical correction; that would require corresponding narration/hash/quiz review.

| ID | Observed issue / evidence | Current disposition |
|---|---|---|
| GAL-H1 | Province metadata is 50 BC–476 AD, region metadata 58 BC–486 AD, while all scene beats concern 52 BC. See `content/borders/provinces/gallia.json`, region JSON and [region inventory](../region-inventory.md). | Historical holding/metadata ranges need an evidence-backed decision. The dated preview already distinguishes episode date from the chosen map era. No dates changed. |
| GAL-H2 | Beat 1 states eighty thousand defenders and beat 5 sixty thousand attackers without explicit attribution in those sentences; beat 3 already attributes Caesar's relief-army figure. Source arrays cite Caesar. | Ancient numerical claims need targeted attribution/historical review under PRD §13. Not adjudicated or edited by this reconciliation. |
| GAL-H3 | Beat 4 says the expelled Mandubii starve; the quiz deliberately asks what Caesar says about refusing passage and avoids treating eventual death as established by that passage. | Review the prose's evidential reach against Caesar VII.78 and specialist work; preserve the accepted wording pending a scoped factual decision. |
| GAL-H4 | Motte's later wall study, repeated/mirrored placements, inferred equipment/colours and unsurveyed staging are interpretive. The Met source's earlier date and modern cheekpieces are explicitly excluded as Alesia equipment evidence. | Keep provenance/draft flags and limitations from ADRs 013/014 and [personnel review](../m8-personnel-review.md). Owner visual acceptance does not validate every reconstruction detail. |
| GAL-H5 | The elaborate surrender is already attributed to later Plutarch, contrasted with Caesar's brief report; the scene does not have a dedicated mounted Vercingetorix rig. | Retain the source distinction; no claim that the ceremony has independent eyewitness confirmation or a mounted asset is present. |

Independent specialist review is not recorded as passed. The cross-cutting process for resolving/releasing historical corrections is in M11; this table retains Gallia's actual questions rather than a vague “unfinished history” label.

## Known accepted composition limits

The hillfort remains an explicit placeholder in all beats; the distant ridge is a placeholder in beats 1–3/5–6. Dedicated engineers/tools, expelled civilian crowds, Caesar/flanking cavalry and Vercingetorix/horse art are absent. Existing painted infantry are not civilian or mounted rigs. The public “Artwork in progress” label remains in the accepted experience.

These are honestly recorded limitations of the accepted composition, not a new requirement to reopen M8 for cosmetic work before adding another region. No missing asset is marked delivered; no draft is promoted by deleting its flag. Any later specialist-art task needs explicit scope and appropriate source/asset approvals.

## Evidence ownership

- **Local implementation:** [M8 handoff](../m8-gallia-handoff.md), [visual](../m8-visual-review.md), [personnel](../m8-personnel-review.md), [performance](../m8-performance-review.md), [narration](../m8-narration-review.md), [M9 quiz](../m9-quiz-review.md) and [M10 audit](../m10-audio-review.md), with their dated raw reports.
- **Owner acceptance:** current Gallia visuals and narration, working quiz, redesigned shell and realistic relief atlas UI. Do not keep asking for approval of these same current experiences.
- **Cross-cutting unverified launch evidence:** actual Android/Pixel-class and Safari/iOS unlock/playback/foreground/background behavior, mobile networking/GPU timing, launch-wide accessibility/Lighthouse and real-provider/approved-environment verification live in [M11](../m11-launch-scope.md). Successful local playback does not independently transcribe the recording or certify historical pronunciation; no such check is claimed. Owner narration acceptance is recorded, not left pending as a taste gate.
