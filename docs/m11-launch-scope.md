# M11 launch scope audit — 2026-10-23

Planning record only. The owner authorized the M10 audio audit and requested this remaining-scope report; M11 has **not started**. This inventory follows the current PRD and source tree, including work already completed outside the original M11 slot. It does not authorize deployment, new services, shared-database writes or another region.

## Already delivered; retain it

| Area | Existing work and evidence |
|---|---|
| Landing | Owner-approved Cole painting, immersive composition, self-hosted Cinzel, responsive crops, honest Gallia-only availability and public entry. `docs/m1-5-shell-review.md` records browser, contrast, keyboard and production size/timing checks. |
| Login/signup | Approved Royer account shell, email/password and Google integration calls, native validation, pending/error/retry states, redirects and public-route access. Real email signup/login/logout/refresh passed against isolated Postgres in M9. A live Google round trip remains unverified. |
| Profile | Approved shell now backed by real XP, rank, UTC streak, viewed scenes and quiz history; guest import verifies server-owned attempts. M9 is owner-accepted. Shared migration/seed remains unapplied. |
| Atlas | Four-era SVG/relief workspace, responsive era cards, zoom/reset, native scrolling, keyboard panning, skip link, clear authored/Coming soon destinations and source credit. `docs/atlas-ui-review.md` records 320/390/768/1440px checks. |
| Gallia/quiz | Public six-beat narrated scene and five-question server-graded quiz, results/retry/atlas flow. M8/M9 owner acceptance does not substitute for remaining history/art/device checks. |
| Baseline accessibility | Real DOM captions, reduced-motion scene/transition path, keyboard atlas/beat controls, native quiz radios/focus movement, accessible shell forms. Existing scoped checks are evidence to retain; they are not a completed launch-wide accessibility audit. |
| CI and budgets | CI already runs typecheck, lint, validation, unit tests and build. Content/rig/transcript/licence gates and asset accounting exist. Actual atlas script transfers are below 180KB; the current Gallia region payload is below 2.5 MiB. |

M11 does not need another landing/auth/profile makeover, another atlas layout, a second audio engine or a replacement quiz/progression system.

## Remaining M11 work

1. **Sharing and indexing.** Finish production metadata/canonical origins and authored-scene descriptions; generate OG/social previews with suitable recorded rights. Add the public-route sitemap and robots policy, excluding private account/quiz and development/fixture routes as appropriate. The root currently has basic title/description; route titles already exist for landing, atlas, auth and quiz. No sitemap, robots route or OG image implementation exists.
2. **Analytics.** Implement the PRD's PostHog measurement path for scene completion, beat drop-off, quiz attach and return engagement; verify event delivery and route/beat lifecycle behavior. There is no analytics implementation or dependency today. Choose the shipping setup first: the PRD names hosted free tiers, while repository conventions prohibit adding an account-required shipping dependency without resolving that conflict. Do not silently assume a new hosted account or paid production tier is authorized.
3. **Error monitoring.** Implement the Sentry path requested by the PRD, including useful scene/WebGL/audio failures and a verified production smoke event. No Sentry integration exists. Resolve the same hosted/account constraint before adding it; keep recoverable audio fallback behavior working.
4. **Launch-wide accessibility and mobile pass.** Exercise landing → atlas → scene → quiz → signup/import → profile and return with keyboard, reduced motion and narrow layouts. Check focus/announcements across routing and errors, source drawers, long text and controls. Obtain actual mid-range Android and Safari/iOS evidence, including audio activation, persistence, navigation/re-entry and network failure. Existing desktop Chrome responsive captures cannot close these checks.
5. **Performance acceptance.** Run and record Lighthouse **≥90 performance and accessibility on non-scene routes**. Existing LCP/contrast/size probes are not Lighthouse results. Verify the atlas <2s 4G TTI, scene <3s first-interactive and <16ms Pixel-6a-class frame-time budgets using the documented methods/target hardware; previous scene samples do not establish those passes. Retain the real transferred atlas-JS and unique region-payload gates already implemented.
6. **Approved-environment launch verification.** When separately authorized, apply reviewed migration 0002 and seed the five questions in the intended shared database; verify real auth/session persistence, guest import and duplicate credit there. Verify Google provider/callback configuration for the selected launch origin. Confirm development/sample APIs and pages stay unavailable in production. Prepare the deploy/runbook and perform deployment only with authorization. None of these shared writes, provider checks or deployment happened during M10.

## Existing PRD gaps to settle before launch

These are observed requirements, not M10 tasks or newly invented features. Assign them explicitly during M11 planning, or record an owner-approved deferral:

- **Read as text** article/toggle (PRD §12): not implemented. Existing scene captions remain available, but the client-only cinematic player is not the specified server-readable article.
- **Atlas completion wreaths** (PRD §8.1/core loop): not implemented. The atlas receives no progress/completion state. Profile viewed-beat completion is not the same as wiring quiz completion into a map mark; settle the displayed completion rule when implementing this requirement.
- **Resume the scene on refresh** (PRD §8.3): viewed beat IDs are stored and imported, but the scene currently initializes at beat 1. There is no saved last-beat read/initial-index path. Quiz resume is implemented and is a separate behavior.
- **Catalog size** (PRD §9): the original launch set lists twelve regions. Only Gallia is authored; the current landing/atlas disclose this honestly. Decide whether to launch Gallia first or fund/authorize the other eleven regions separately. They are content production, not an excuse to rebuild the M11 shell or expand this M10 session.

Outstanding independent historical/art review and the missing specialist Gallia art remain recorded from M8. Voice pronunciation, full listening/mix/pacing judgement and target-device/network evidence remain separate from owner acceptance of the current experience. Launch readiness must state the actual decisions/results rather than turning these items into passed checks.

## Evidence locations

- `docs/m1-5-shell-review.md` and its linked browser/performance records.
- `docs/atlas-ui-review.md` and `docs/reviews/atlas-ui-{browser,transfers}.json`.
- `docs/m9-quiz-review.md`, `docs/m9-testing.md` and M9 browser/test reports.
- `docs/m10-audio-review.md` and its linked current audio evidence.
- Current source: `app/layout.tsx`, `app/atlas/page.tsx`, `app/atlas/buildAtlasProps.ts`, `lib/quiz/useSceneProgress.ts`, `engine/scene/BeatDirector.ts`, and `.github/workflows/ci.yml`.
