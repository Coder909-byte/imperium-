# Repeatable Roman region-completion checklist

Use this for region two and later campaigns. It reuses the existing schemas/tools and [art pipeline](art-pipeline.md), rather than creating a new milestone sequence. Keep three separate statuses in the region's status/review: **implemented and locally verified**, **owner-accepted experience**, **external checks still unverified**. The complete accepted Gallia baseline is [recorded separately](regions/gallia-status.md); do not reopen it for cosmetic work while producing another region.

## 1. Episode and research gate

- [ ] Confirm exact existing province ID, episode dates, proposed endpoint, 4–8 beat outline and why the story fits existing systems. Check [region inventory](region-inventory.md) and PRD §9. Do not silently add a province or multi-episode router.
- [ ] Obtain owner approval of episode/outline **before full narrative or artwork**. Keep the proposal distinct from runnable `content/regions/` files; adding even a provisional valid file can make it appear in the real atlas catalog.
- [ ] Create a short source/claim matrix: precise ancient work/section, trustworthy edition/link, modern control, bias/dispute, and intended beat/question. Attribute ancient numbers, later speeches and uncertain staging. Keep specific unresolved history in that region's document; independently unreviewed claims are not marked verified.

## 2. Prose and citations

- [ ] Write approved 4–8 beat prose with unique stable IDs, explicit dates, ≤80-character headlines and 180–700-character bodies. Infer content types from `content/schema.ts`; schema permits 1–10 for generic fixtures, but the production target remains 4–8.
- [ ] Concrete detail, restrained tone, clear story progression; mark literary interpretation and disputed claims. No invented eyewitness dialogue presented as fact. Follow PRD §§8.3/13 and [Gallia's historical register](regions/gallia-status.md) as an example of honest limits, not a source to copy.
- [ ] Review/approve the prose and sources before generating narration. Every content change after that requires transcript/hash, recording and affected-quiz review. Record independent historical review accurately; arrange the cross-region launch review via M11.

## 3. Artwork, rights and approved reuse

- [ ] Inventory every planned plane, figure and sound: **already approved for this use**, **candidate requiring scope extension**, **new source/approval required**, or an explicitly agreed placeholder. Existing Gallia or shell approvals are not blanket next-region permissions.
- [ ] Follow [art pipeline §§1–3](art-pipeline.md): specific scan/source URL, exact rights evidence, creator/institution, source hash and derivative history. Add the manifest row at file entry. Scope generated/provisional assets separately under ADRs 013/014/015; never relabel generated output PD/CC0.
- [ ] Obtain needed owner scope approval for each new/extended use before production/integration. Record what was approved, who/when and what is still interpretive. Proposed episode approval alone does not expand an asset grant.
- [ ] Register full-colour planes on the shared 2520×1080 scene canvas with alpha/overscan and intended camera crops (ADR 011). Use existing role/draft/visibility/depth/low-tier flags; at most four essential physical planes, with only eligible atmosphere grouping (ADR 012). Forge/manifest validation does not grant historical approval.
- [ ] Budget unique referenced **planes + rig parts + all audio below 2.5 MiB**. Reserve new narration/audio early; do not assume six 400KB planes leave room. Measure real output files using `measureRegionAssets`/`npm run validate`; transient crowd atlases are runtime memory, not free GPU work.

## 4. Rigs and scene composition

- [ ] Reuse only appropriate, permitted rigs/clips. New commander/civilian/animal roles need actual suitable art; tinting existing infantry does not supply them. See ADRs 006/007/014 and [personnel review](m8-personnel-review.md).
- [ ] Validate part IDs, hierarchy/pivots, all referenced clips, locomotion, crossing exemptions and declared symmetry through the existing numerical rig linter. Inspect anatomy, alpha seams, ground contact and crowd phase/spacing in the existing rig inspector.
- [ ] Every beat has deliberate camera motion and the established noise/reduced-motion path. Check intended light-source/effects and low/high tiers. Avoid speculative renderer expansion; document any demonstrated missing capability before deciding on a narrowly scoped change.

## 5. Narration and sound

- [ ] After prose/scope approval, produce new narration with the verified tool/model/stock-voice path (ADR 015 and [narration provenance/reproduction](m8-narration-review.md)). Do not reuse Gallia speech for different text. Record transcript/hash, output hash/duration/bytes, model revision/voice grants and scoped approval for every recording.
- [ ] Source/approve any new bed/cues and verify old files' reuse scope. Author cue gains/intensities deliberately; silence can be intentional. Follow [M10's playback contract and audit](m10-audio-review.md), not a second audio implementation.
- [ ] Verify trusted activation, independent persisted controls, current-beat-only voice, ducking/crossfades, actual-end-led autoplay and reading fallback, mute/replay, rapid changes, delayed/failed downloads and exit/navigation cleanup. Listen to all beats; distinguish owner acceptance from independent pronunciation/transcription proof and actual-phone tests.

## 6. Quiz and progression

- [ ] Write exactly five questions/four unique option IDs each, grounded in approved final beats/sources. Global question IDs must be unique across regions. Include all four keys in `feedbackByOptionId`, correct answers included; keep feedback under 30 words and follow PRD §8.5.
- [ ] Use existing Zod/private bank/server grading and allowlisted public contracts. Verify no key, answer flags or revealing feedback before the corresponding submission, including HTML, network and production chunks. Reject malformed/foreign/mismatched IDs; no client score/XP trust.
- [ ] Reuse `lib/quiz/progression.ts` and ADR 018. Check first-correct credit across retries and concurrent sessions, UTC streaks, anonymous local references, signup/login proof and database uniqueness/transactions. Test **both regions together**: no cross-region session/option or guest-credit confusion. Do not retune thresholds silently; reassess provisional thresholds explicitly as the catalog grows.
- [ ] Seed only into an isolated approved test DB for verification. Keep necessary migration/seed files reviewable; shared data mutations require separate authorization. See [M9 trust/migration policy](m9-quiz-review.md) and [test guide](m9-testing.md).

## 7. Atlas and app integration

- [ ] Match province/region IDs and explicit episode dates. Keep holding era distinct from story date. Existing discovery is filename-driven; verify the new campaign appears from every era's catalog, including when its province is not historically held.
- [ ] Scene → quiz → results → retry/atlas/profile actions use the selected region. Remove only demonstrated one-region labels/CTAs while preserving the accepted design; [the Italia proposal](regions/italia-rubicon-proposal.md) records current findings. Keep `engine/` independent of `content/`.
- [ ] Public atlas/scenes/quiz remain accessible without signup. Existing auth/profile guards remain. Do not mark unavailable provinces as playable or expose Test fixtures as campaigns.

## 8. Verification, review and completion

- [ ] Run `npm run validate`, typecheck, lint, relevant grading/progression/rig/audio unit checks and production build. Add meaningful tests alongside required behavior/glue changes; preserve existing Gallia regressions. Run mutating tests only against the guarded isolated database.
- [ ] Run real browser flow for the new region plus a Gallia regression. Capture/inspect each beat at desktop/narrow widths, high/low tiers, reduced motion, camera entry/settled framing, sources and controls. Check overflow, page errors, failed assets, keyboard focus and loading/retry states. Record environment and paths; screenshots are local review artifacts, not new shipped art.
- [ ] Measure actual unique referenced payload and actual gzip script transfers using the existing documented methods. Mark target-device FPS/4G/Safari claims **unverified** unless actually measured; shared launch acceptance is tracked in [M11](m11-launch-scope.md).
- [ ] Record owner acceptance of prose/experience/quiz precisely, preserve any allowed draft limitations and keep remaining specific historical questions visible. Region completion does not automatically close M11; M11 is not a reason to keep an otherwise accepted region indefinitely “unfinished.”
- [ ] Update `docs/project-status.md`, the region review and `docs/region-inventory.md`; synchronize AGENTS/CLAUDE current state. Do not renumber milestones. Do not commit, push, deploy or mutate shared data without authorization.
