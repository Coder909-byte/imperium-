# Italia — Rubicon production record

**2026-10-25: implementation delivered; final experience review pending.** The episode/outline, exact six-beat prose and IT-A1–A5 artwork/use-scope batch are owner-approved. Prose approval is editorial, not independent historical verification. The resulting Italia visuals, six recordings and quiz are ready for review; production authorization is not recorded as final listening/visual/quiz acceptance. Gallia remains accepted and unchanged. No visible hatched development planes or procedural military markers remain in Italia.

## Delivery against the region checklist

| Area | Implemented / approval / limits |
|---|---|
| Episode and outline | Approved: January 49 BC, Caesar’s crossing and opening of civil war, ending at Pompey/the consuls leaving Rome. [Proposal](italia-rubicon-proposal.md) preserves the original decision. |
| Prose and citations | All six approved bodies/headlines and every linked citation entry preserved verbatim. [Approval snapshot](../reviews/italia-approved-prose.json), [complete prose/source-bias drawer](italia-prose-review.md). Only obsolete non-linked temporary-art status notes changed as real art replaced layouts. |
| Artwork/provenance | Seven actual painted planes provide six distinct settings: political hall, mustering ground, river backdrop/alpha near bank, town approach, dispatch courtyard and civic departure. Specific-file Met/ANS rights, URLs/hashes and separate generated-derivative grants are in the manifest. [Prompt/output ledger](../reviews/italia-art-prompts.json). The crossing was produced/rendered first as the visual reference; town/civic compositions followed. |
| Rigs/composition | New provisional Caesar and unnamed civic group use connected full-body tableau cutouts with restrained root idle, not articulated limbs or walking claims. Existing six-part Roman infantry/crowd bake reused under explicit Italia scope. Existing numerical linter passes for all three. No Gallic/cavalry/siege scenery reused. All beats have camera entry/dwell motion and existing noise/reduced-motion paths. |
| Narration/sound | Six new complete George recordings; pinned Kokoro q8/model revision/voice binary/speed unchanged. Transcript/output hashes, duration, sentence/token provenance and tool/model/voice grants recorded. [Generation](../reviews/italia-narration-generation.json), [encoding](../reviews/italia-narration-encoding.json). Permitted wind/cloth reuse only; no timber work. |
| Quiz/progression | Five questions, four options and feedback for every option ID, grounded in the approved prose/citations. Caesar’s justification remains attributed; later anecdotes remain later traditions. Existing server grading/private bank, guarded ID validation, transactions/unique credit ledger and guest proof reused. Italia maximum 80 XP; Gallia + Italia = 170 XP (Immunis), still short of every rank. Existing thresholds remain provisional; no silent reward retuning. |
| Atlas/app | Both public campaigns and quizzes available through existing catalog; actual episode date distinct from map holding eras. Region names/CTAs and profile progress stay generic. Other 22 provinces remain Coming soon. |
| Local verification | See [production review](italia-production-review.md) for actual command/browser evidence and reruns. No target-device, shared-target or production-deployment pass inferred. |

The existing artwork badge reflects **provisional representation flags**, retained deliberately. It is not evidence of a missing texture: all Italia plane/rig references resolve to real painted files. The asset batch did not make clothing, architecture or Caesar’s likeness historically certain. The distinct settings exposed a low-tier global-selection limitation; the targeted [ADR 020 fix](../adr/020-distinct-beat-settings-on-low-tier.md) retains Gallia’s established selection while capping co-visible planes and keeping alternative settings cached. No audio engine change, auth configuration change, new runtime dependency or schema migration was needed.

## Historical and representation register — still open where stated

| ID | Specific limit |
|---|---|
| IT-H1 | Precise crossing day, exact modern river identification and crossing point remain disputed; no bridge/GPS claim. January follows the contemporary Roman calendar. |
| IT-H2 | Caesar defends his own conduct. Cicero is contemporary but partisan and sometimes report-dependent. Later Plutarch/Suetonius dramatize; dice words/hesitation are not an eyewitness transcript and the apparition is neither asserted nor depicted. |
| IT-H3 | The accounts differ over meeting/address/occupation sequence. They are not spliced into a proven minute-by-minute reconstruction. |
| IT-H4 | Earlier disarmament proposals are recalled without moving the Capua reply before Rome’s evacuation. The endpoint concerns departing leadership, not every resident, Caesar entering Rome, or the whole war ending. |
| IT-H5 | French river painting supplies atmosphere; Boscoreale supplies imagined architectural vocabulary; the later coin supplies a limited portrait reference; Room H supplies drapery/paint handling. None proves this actual site, season, costume or 49 BC likeness. Generated imagery remains interpreted/provisional. |

Independent historical specialist verification, actual-phone/Safari/GPU/4G performance and the owner’s final listening/art/quiz judgement are **unverified**. Cross-cutting launch checks stay in [M11](../m11-launch-scope.md); Gallia is not reopened for them.

## Payload and preserved baseline

Italia references **2,537,195 bytes / 23 files**, under the unchanged **2,621,440-byte** limit by 84,245 bytes. Audio is **1,174,371 bytes**, including **1,098,816 narration bytes**. Staging references and full-resolution generated originals are not route downloads. Gallia remains **2,124,928 bytes / 31 files**; its region JSON, rigs and public binaries are unchanged. Shared infantry/cloth files remain unchanged; Italia now uses a separately encoded MP3 of the same approved 12-second wind loop, with provenance and numerical checks in [the encoding record](../reviews/italia-wind-encoding.json). Gallia’s WAV is unchanged.

## Review environments and safe reproduction

- **Normal development: http://localhost:3000**. Existing `.env.local` and Better Auth configuration unchanged. Do not run mutating verification against its shared database.
- **Isolated production review: http://127.0.0.1:3006/scene/italia** and `/quiz/italia`. Synthetic auth variables, disposable local Postgres at loopback port 55439, database `imperium_m9_test_italia`; existing migrations and all ten question rows installed only there. Local email signup/profile/import may be tested here; Google is not configured or verified. No new migration file was needed.
- **Port 3008 is retired.** It was a deliberately isolated no-DB prose/layout preview with an unreachable loopback URL, never a replacement Better Auth origin. Earlier reports retain that historical port; no auth configuration was silently changed to accommodate it.

Use the existing [M9 testing guide](../m9-testing.md), `assertIsolatedTestDatabase`, and explicit synthetic variables for mutating checks. Never inherit the shared URL as a fallback. Because shared schema/question seed state is unverified and was not changed, the normal environment may report that the Italia bank is not installed; use the isolated review URL for the complete quiz flow. Any shared seed/migration requires separate authorization.

## Preserved earlier-stage evidence

Before this production approval, the prose/layout stage recorded **334 tests / 46 files**, typecheck/lint/40-file validation/build, 23 scoped development checks and a final four-check production Italia rerun. It inspected 25 temporary-layout captures in four modes, measured 144,602 atlas gzip bytes and scanned 51 browser chunks. Those results are preserved in [stage-one checks](../reviews/italia-stage-one-checks.json), [earlier browser run](../reviews/italia-production-browser-tests.json) and [draft rendering](../reviews/italia-draft-rendering.json). They were not final-art/audio/quiz acceptance and are not added to fresh production counts.

No commit, push, deploy, shared database mutation, Gallia cosmetic work or M11 launch work performed. The owner’s subsequent review described the rest as good and requested specific Ariminum overlap, cloned Rome figures and repeated-setting corrections. Those are addressed in [the visual revision](italia-visual-revision.md); new replacement artwork awaits the owner’s review, while external checks remain open.
