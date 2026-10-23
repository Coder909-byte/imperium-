# M9 — Gallia quiz and progression

The owner accepted M8's current Gallia experience and the updated atlas visuals on 2026-10-23, and authorized M9 only. M8 is recorded as owner-accepted. Independent historical review, missing specialist hillfort/ridge/engineer/civilian/mounted art, full narration pronunciation/listening/mix/pacing and Safari/Pixel-class GPU/network checks remain outstanding. That acceptance does not turn these checks into passes. Earlier M8 records remain historical evidence.

## Delivered behavior

Gallia's final scene opens a five-question, four-option quiz with no timer or deadline. Keyboard radio controls, focus movement, pending/retryable error states and responsive results use the approved vintage shell. Results include score, feedback, explanations, sources, retry and return-to-atlas actions. Atlas and scenes stay public. Scene beats, paintings, narration and citations are unchanged; only generic quiz/progress callbacks were added to the engine.

Five authored question files reference the final Gallia beats and sources. Caesar's descriptions and Plutarch's later surrender account are attributed, rather than treating ancient claims as certainty. Every option ID has feedback, including correct answers; validation enforces fewer than 30 words and the prohibited-reaction rules. Authoring types derive from Zod. Content validation also checks question uniqueness, five questions per region and valid beat/source references. The private filesystem bank never enters client props or `engine/`.

The profile now displays actual XP, rank, streak, viewed scenes and completed quiz history. The development-only sample profile retains its preview empty state. Auth configuration is preserved. No dependency, asset, paid service or new region was added.

## Grading and trust boundary

`POST /api/quiz/session` snapshots the validated private questions on the server and returns an explicit allowlist of question IDs, prompts and four options. `GET` resumes an owned session. Only an already submitted question receives a verdict, correct-option ID, selected-option feedback, explanation and sources. No full private bank or future feedback is returned. `POST /api/quiz/answer` validates strict JSON, ownership, question membership, option membership and answer order. Malformed IDs, cross-question options, unknown sessions, foreign owners and conflicting changes are rejected. Same-choice resubmission returns the existing result.

Authenticated completion locks the profile, then the session, in one database transaction. A unique `(session_id, question_id)` answer constraint and unique `(user_id, question_id)` credit ledger guard duplicate/concurrent submissions and parallel completed attempts. XP is based on inserted ledger rows, not a client score or an optimistic total. Credit survives deletion of the associated attempt. Each fresh retry can earn only previously missed questions. A completed practice retry can maintain the streak without awarding XP again.

Anonymous localStorage stores only completed attempt references and viewed-beat IDs. Server-stored anonymous attempts are bound to a random HttpOnly, SameSite cookie; the database stores its hash. Signup/login's profile import requires that browser proof, regrades stored answers, deduplicates ledger credit and claims only completed guest attempts. A UUID alone cannot transfer rewards. Strict migration input rejects XP, rank, score, streak and activity-date fields. Viewed-beat imports are untrusted convenience progress and award no XP or streak. An import counts as activity on its server UTC import day, with no backdating. Re-importing an already claimed attempt adds no activity. Corrupt/unavailable local storage and failed imports have clear states; failed imports retain references for retry.

An anonymous attempt requires the same browser credentials and retained server record to resume/import. Anonymous XP is presented as potential credit until verified. No account is required to read the scene or take the quiz.

## Approved progression policy

ADR 018 records the owner's decision. `lib/quiz/progression.ts` is the single shared configuration for reward amounts and thresholds.

| Difficulty | XP for first correct credit |
|---|---:|
| 1 | 10 |
| 2 | 20 |
| 3 | 30 |

| Rank | Minimum total XP |
|---|---:|
| Tiro | 0 |
| Miles | 50 |
| Immunis | 150 |
| Optio | 350 |
| Centurio | 700 |
| Primus Pilus | 1200 |
| Legatus | 2000 |

All five questions must be completed before credit is banked. Gallia offers at most **90 XP**; it cannot unlock every rank. Thresholds are provisional and should be reassessed as more quizzes become available.

A day is the server's UTC calendar day. Completed quizzes, including practice retries, count once per day; adjacent days extend the streak, a missed day resets it, and imported historical dates do not count. The UI states **“Daily streak resets at 00:00 UTC”**. This is a day boundary, not a countdown or quiz timer.

## Local database and deployment boundary

Shared Neon was not migrated, seeded or used for mutating checks. `.env.local` was not changed. The new local migration is `db/migrations/0002_dashing_shaman.sql`, with its generated snapshot/journal. The validated, explicit-write seed command is `npm run db:seed-questions`. Both are ready for review; applying/seeding shared Neon still requires separate owner approval. The quiz reports a clear installation error if its question bank has not been installed.

Tests used a separate disposable Postgres 16 cluster in `/tmp/imperium-m9-pg`, bound to `127.0.0.1:55439`, database `imperium_m9_test_final`. Existing migrations 0000/0001 and the final 0002 were successfully applied to this fresh database, then all five questions seeded with the documented command. Synthetic auth credentials and test accounts were used. Mutating browser helpers fail closed unless the URL uses loopback, port 55439 and the dedicated `imperium_m9_test` database name/prefix. The local production preview at port 3006 uses this database, not shared Neon.

For reproduction, set `DATABASE_URL` to that disposable database, use a synthetic `BETTER_AUTH_SECRET`, and set `BETTER_AUTH_URL` and `PLAYWRIGHT_BASE_URL` to `http://127.0.0.1:3006`. Apply migrations and seed only after confirming these values; start the built app at port 3006. No environment file or actual credentials are included in this review.

## Verification

- Unit suite: **330 tests / 44 files**, including grading, option validation, public-field allowlisting, rank boundaries, duplicate credit selection, UTC streak boundaries and untrusted local migration contracts/cache handling.
- Typecheck, lint, **39-file** content/rig/transcript validation and final production build pass.
- Development browser suite: **34 distinct checks** across M9 (12), auth (1), region entry (5), narration (5) and shell (11). Complete scene → quiz → results → atlas → retry, keyboard/narrow controls, loading/errors, malformed/foreign/out-of-order submissions, real local email signup/login/logout/refresh, automatic guest import, tampered/duplicate/concurrent imports, retries, concurrent awards, UTC practice streaks and long-reading-break resume are exercised.
- Final production subset: **18/18 passed** against the fresh final migration/seed and `next start`, including all 12 M9 checks, email auth and all five region-entry checks. [Recorded checks](reviews/m9-production-tests.json).
- Production answer-key checks inspect pre-submission HTML/JSON/downloaded scripts and confirm later questions remain private after the first answer. The separate built-artifact audit scans **all 51 browser JavaScript chunks** for every private explanation and option-feedback value: zero leaks. Server output traces include the private question files as server dependencies only.
- **14 rendered states** (intro, question, incorrect/correct feedback, results, real isolated profile and synthetic submission error at 1440/390px) have no overflow, page errors, unexpected failed responses or detected axe WCAG 2 A/AA/2.1 AA violations. The audit uses the existing local axe-core 4.13.0 tool (unshipped, no package dependency added). Axe leaves texture contrast incomplete; a separate rendered-background pixel audit checks **573 text lines**, with no failures and a minimum ratio of **5.35:1**. Disabled buttons are excluded from text contrast checks. This is a scoped desktop rendering audit, not accessibility certification or physical-device acceptance. [Browser/contrast report](reviews/m9-quiz-browser.json).
- The actual served atlas script tags transfer **144,590 gzipped bytes**, excluding the `noModule` legacy script, below the <180KB budget. Relief remains 240,712 bytes separately. [Transfer report](reviews/m9-atlas-transfers.json). No new TTI or device timing pass is claimed.
- Inspected desktop and narrow screenshots retain the approved parchment, Roman typography and restrained controls. Full results and profile text remain readable in document flow. Captures: `/tmp/imperium-m9-final/{intro,question,incorrect-feedback,correct-feedback,results,profile,submission-error}-{1440,390}.png`.
- Engine production imports still contain no `content/` dependency, no TypeScript `any` was introduced, and `git diff --check` passes. Gallia's authored region/assets are unchanged at **2,124,928 bytes / 31 files**.

Initial production subsets hit Better Auth's existing 3-per-10-second signup limit while creating many fixtures: 14 passed, four fixture signups returned 429. The fixture initially checked the standard header; the installed Better Auth version supplies `X-Retry-After`. The helper now respects that bounded retry window once, without weakening auth configuration. The final 18/18 run passes with these fixture waits.

No live Google-provider round trip, shared-Neon migration, physical device, Safari, historical specialist review or M10/M11 acceptance is claimed. No commit, push or deployment was performed.

## Remaining decisions and work

No XP/rank policy decision is pending: the owner's approved provisional configuration is implemented. Shared deployment still needs explicit permission to apply migration 0002 and seed the five questions, followed by checks in that approved environment. Until then, the local isolated production preview is the review target. M10/M11 have not started. M8's outstanding historical/art/listening/device checks above remain open.

Local verification commands (with the isolated environment above):

```sh
npm run test
npm run typecheck
npm run lint
npm run validate
npm run build
npx playwright test e2e/quiz-flow.spec.ts e2e/quiz-progression.spec.ts e2e/quiz-migration.spec.ts e2e/auth.spec.ts e2e/region-entry.spec.ts --workers=1
node --import tsx scripts/audit-quiz.mjs http://127.0.0.1:3006 /tmp/imperium-m9-final
node scripts/measure-atlas.mjs http://127.0.0.1:3006 /tmp/imperium-m9-atlas-transfers.json
```

The audit command expects the temporary local axe tool at `node_modules/axe-core/axe.min.js`; it is not an app dependency or shipped asset. Start the production preview before the browser/audit commands. The main Playwright suite also contains development-only fixture routes; the production subset above intentionally uses production routes only. Use the **127.0.0.1** preview URL matching the configured auth origin. The previous shell/atlas preview ports are no longer the active review server.
