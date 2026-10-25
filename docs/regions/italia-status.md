# Italia — Rubicon production record

**2026-10-25: in progress; not complete.** The owner approved Italia, January 49 BC, the six-beat outline and an endpoint at Pompey/the consuls leaving Rome. This authorizes prose drafting, integration, clearly temporary composition and a batched artwork proposal. It does not approve the new prose or art yet. Gallia's accepted experience remains unchanged.

## Delivered in this stage

- Six complete draft bodies, **408–444 characters each**, headlines and per-beat citation/bias/uncertainty notes in `content/regions/italia.json`. [The complete prose review](italia-prose-review.md) reproduces the exact text and body hashes for approval. No exact crossing day, identified modern river, certain bridge or unattributed dice anecdote is asserted. Caesar's political justifications remain his account.
- Public `/scene/italia` and atlas preview entry with **January 49 BC**, independent of the selected map era. Existing `italia` province geometry/holding metadata is unchanged. Both campaigns remain discoverable; the other 22 provinces remain Coming soon.
- Four explicitly missing art references, procedural military layout markers, six authored opening/dwell camera moves and changing town/river/road compositions. A prominent app-owned draft notice identifies **all** scenery and figures as temporary. No military placeholder impersonates a named commander or civic crowd; beats 1/6 deliberately leave those absent.
- Generic quiz intro/question/result labels and metadata now receive safe region names/dates; profile names/quiz actions derive from the server catalog. Navigation points to both stories; the landing retains Gallia's flagship composition and adds an honest Italia draft link. The stale signup “progress still to come” copy is corrected. Existing layout/art/auth configuration are preserved.
- Scene viewed-beat recording is no longer incorrectly gated by quiz availability. Italia uses existing local progress/validated server routes; quiz availability still controls the quiz action. Test fixtures are not tracked as campaigns. No progression rule, schema/migration, reward or database data was changed.
- [One artwork/use-scope batch](italia-artwork-proposal.md), including new riverbank, town, commander/civic figures and narrowly requested reuse. Rights checked against specific institutional records; no new source file/download, generated image or manifest approval has entered the repo.

The only engine edit is generic atlas catalog wording and a stories anchor. No engine content import, scene/audio behavior change, paid dependency or new rendering subsystem was introduced. Reuse in this stage is limited to existing engine/procedural fixtures and site-wide atlas/font/shell assets; Gallia's restricted scenery/painted rigs/audio await the requested Italia scope extension.

## Completion checklist allocation

| Checklist area | Current status / next gate |
|---|---|
| Episode / outline | **Owner-approved.** Original proposal retained; endpoint unchanged. |
| Prose / citations | **Draft implemented; awaiting owner approval.** Source checks recorded, independent specialist review not claimed. |
| Approved artwork / provenance | **Pending batch decision and actual production/review.** Four visible development planes; no final artwork pass. |
| Rigs / composition | **Temporary composition only.** Generic procedural legionary; named commander/civic roles absent pending suitable art. |
| Narration / ambience | **Not produced.** Six new George recordings authorized conditionally after prose approval, using ADR 015's exact licence/provenance process. No voice-sample approval is being requested again. Wind/cloth Italia reuse is part of the art/use batch. |
| Five-question quiz | **Not authored yet**, as requested until prose approval. `/quiz/italia` intentionally returns 404; the scene offers no quiz action. No placeholder bank or seeded Italia rows. |
| Atlas / app integration | **Implemented for draft preview.** Safe multi-region metadata/display and scene visits supported; final quiz flow remains pending. |
| Validation / rendered review | Results recorded below. Temporary-layout checks never count as final visual-quality acceptance. |
| Owner experience acceptance | **Not sought for the temporary composition.** Italia cannot be complete with visible development placeholders. |
| External launch checks | Remain separately unverified under [M11](../m11-launch-scope.md); specific Italia history issues below remain regional. |

## Historical controls / unresolved regional review

| ID | Control / disposition |
|---|---|
| IT-H1 | January is a contemporary Roman-calendar label, not proof of modern January weather. Exact crossing day and identification/location remain uncertain; no survey/bridge reconstruction is claimed. |
| IT-H2 | Caesar's legality, tribunes/honour framing and disarmament proposal are attributed. His statement of military support is not an independent poll. Cicero is a partisan counterweight, also dependent on reports. |
| IT-H3 | Plutarch/Suetonius are later biographical traditions. Hesitation/dice/speech details are attributed; apparition not depicted. Accounts disagree about meeting/address sequence. |
| IT-H4 | Beat 5 recalls earlier disarmament proposals and contemporary negotiations/advances. It does **not** stage the Capua reply before Rome's evacuation or continue to Brundisium. “Rome empties” does not mean every citizen fled. |
| IT-H5 | New architectural/clothing/portrait art requires evidence/approval. Boscoreale imagined vistas, later coin portrait, later toga and nineteenth-century French river atmosphere each have explicit limits in the artwork brief; rights status alone does not establish historical suitability. |

## Verification and reproduction

Final checks: **334 unit tests / 46 files**, typecheck, lint, **40-file** content validation and production build pass. The scoped development run passed **23/23 browser checks** across Italia, region entry, shell and Gallia; after the temporary actor placement correction, the **4/4 Italia checks pass again against the production build**, including all six source drawers at 1440px/390px, local viewed-beat storage, navigation and the intentionally absent Italia quiz. These are 23 distinct checks plus a final production rerun of four, not 27 distinct scenarios.

Inspected **all six beats** at desktop, pinned high/low and 390px reduced motion, with 25 final captures including a settled crossing frame. Initial captures exposed off-stage/occluded temporary soldiers; authored Italia coordinates/depth were corrected without an engine change. Final captures show the military markers in frame, readable copy/controls and explicit draft status. Zero page errors, failed responses, overflow or Italia asset requests in the final four-mode audit. Civic/commander art is still absent; hatched planes are still plainly development placeholders. This is not a final artwork/quality pass. Captures: `/tmp/imperium-italia-draft-final-2026-10-25`; source-open production captures: `test-results/italia-*` (temporary test output).

All **51 production browser JS chunks** were scanned for every existing authored question explanation and option-feedback string, including escaped variants: **zero private-content leaks found**. This non-mutating scan is not a rerun of the M9 server/session/migration suite. Atlas script tags transferred **144,602 actual gzip bytes / 7 scripts**, below 180 KiB, using real production HTTP responses and excluding noModule. It is not a TTI/device pass. Reports: [stage checks](../reviews/italia-stage-one-checks.json), [production browser run](../reviews/italia-production-browser-tests.json), [rendering matrix](../reviews/italia-draft-rendering.json).

The local review server uses synthetic auth values and an **unreachable loopback database URL**, never `.env.local`'s shared target. Italia tests and visual audits intercept scene-progress requests; other anonymous Gallia checks may reach the public progress endpoint and return unsaved without a user. Auth actions in the scoped shell suite use mocked responses. No real signup, session submission, migration/seed or shared DB query/write is performed. Italia's temporary asset references are intentionally excluded from final-payload accounting: **0 referenced bytes** is an absence of real assets, not a budget pass for a finished region. Gallia remains 2,124,928 bytes / 31 files.

Run the non-mutating suites against that isolated local server, with `PLAYWRIGHT_BASE_URL` and synthetic environment values set: `e2e/italia.spec.ts`, `region-entry.spec.ts`, `shell.spec.ts` and `gallia.spec.ts`. `scripts/audit-italia.mjs <base> <output>` captures desktop, pinned high/low and narrow reduced-motion draft compositions; production supports desktop/narrow only because scene-lab correctly returns 404. Use the existing M9 isolated DB guard later for actual multi-region quiz/import verification, after prose approval and question authoring.

No commit, push, deployment, shared database mutation or M11 launch work. Existing staged reconciliation documentation is preserved.

## Review entry / next decision

At verification time the production prose/layout preview is served at **http://127.0.0.1:3008/scene/italia**, with both stories discoverable at `/atlas`. It uses the no-database review environment; it is not a live auth/quiz testing environment. Inspect process state after any restart rather than assuming this temporary server persists. The dedicated development server used for pinned-tier captures was stopped before production build/start.

Await **full prose approval** and a separate decision on **IT-A1–A5**. Prose approval unlocks the already-authorized five-question/George narration stage; the art batch unlocks its explicitly scoped production/reuse. Continue with the region checklist rather than marking the placeholder preview complete.
