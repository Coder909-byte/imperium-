# Testing M9 locally

Use **http://127.0.0.1:3006**, the production preview backed by the disposable local Postgres database. Keep the same hostname throughout signup and login. Port 3000 is a separate server; it does not inherit this preview's database setup.

The five authored questions are `content/questions/gallia-01.json` through `gallia-05.json`. Each contains options, the answer key, feedback and citations. These are server-side authoring files, not a public question-bank page. The isolated database has all five seeded question rows. A “quiz bank has not been installed” message means the database used by that server lacks the seeded rows. Shared Neon has deliberately not been migrated or seeded.

## Manual walkthrough

Start in a fresh private browser window so earlier attempts or accounts do not affect the totals. Keep this window open through signup; the guest cookie and localStorage connect its completed attempts to the new account.

1. Open `/atlas`, enter Gallia and reach its final beat. Choose **Test yourself on Gaul**, then **Start quiz**. You can also open `/quiz/gallia` directly.
2. Complete the five questions without signing in. For a predictable test, choose **To supply timber for Roman towers** on question 1, then answer questions 2–5 correctly using the authoring files. Expect **4 out of 5**, with up to **80 XP** awaiting account verification. Every answer should show feedback, context and a source only after submission.
3. Choose **Create an account** from results. Use a new test email and a password of at least eight characters. Email/password signup works against this local database; real Google sign-in is not configured in the isolated preview.
4. On `/profile`, expect **80 XP**, **Miles**, a **1-day streak**, and one completed quiz. Saved-progress import should report 80 new XP. Reload: these values should persist.
5. Take the quiz again and answer all five correctly. Expect **5 out of 5**, **10 new XP**, and **90 total XP**. The first question is the only remaining credit.
6. Complete another perfect retry. Expect **0 new XP**, still **90 total XP**, still **Miles**. Multiple completions on the same UTC day keep the streak at one day. Gallia cannot unlock the higher ranks by itself.
7. Log out, then log back in with the same account. Confirm the profile retains XP/history and that atlas/scenes remain accessible while logged out.
8. In a fresh quiz, answer one question, reload, and continue. The submitted answer should remain graded. Use Tab and arrow keys for radio options; check results and controls at a narrow window width too.

For the first anonymous 4/5 run, refresh results before signup if you want to check anonymous persistence. Do not clear browser storage/cookies before importing. Clearing localStorage does not reset an authenticated account's earned credit; use a new test account for fresh totals.

## Automated checks

The preview's synthetic local environment is currently saved at `/tmp/imperium-m9-test-env.sh`. It overrides `.env.local` for the test process. From the repository root, with the production preview running:

```sh
source /tmp/imperium-m9-test-env.sh
npx playwright test e2e/quiz-flow.spec.ts e2e/quiz-progression.spec.ts e2e/quiz-migration.spec.ts e2e/auth.spec.ts e2e/region-entry.spec.ts --workers=1
```

These 18 checks cover the complete scene/quiz/results flow, answer-key privacy, malformed/foreign submissions, loading/errors, signup import, tampered imports, duplicate/concurrent submissions, retry credit, persisted history, UTC streak day gaps and long-break resume. They create synthetic test accounts/attempts and modify dates only in the isolated test database. Their database guard rejects shared Neon. Do not run them against a normal shared environment. The full browser suite also uses development-only fixture routes, so use the subset above for this production preview.

For grading, rank boundaries, UTC boundary logic and untrusted local-progress contracts:

```sh
npm run test
```

Do not alter your computer clock or shared database to test streaks or concurrency manually; those scenarios are covered in the isolated automated checks.

If the temporary preview/environment is gone after restarting the machine, the database setup and reproduction details are in [the M9 review](m9-quiz-review.md). Running the ordinary dev server alone does not install the migration or question rows. Applying migration 0002 and seeding shared Neon still requires explicit owner approval.
