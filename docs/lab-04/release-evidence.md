# Lab 4 Release Evidence

## Final-main release snapshot

The Lab 4 application release was integrated by approved PR [#84](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/84). The verified source was `main` commit [`5dd4ff09b425e64352cc74318bb0af9063e7ab82`](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/commit/5dd4ff09b425e64352cc74318bb0af9063e7ab82), tree [`35126d193c93dc26767f92efea7ce5ebee573d1c`](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/tree/35126d193c93dc26767f92efea7ce5ebee573d1c), checked on 2026-10-31.

- Issues #64–#72 are closed and the Lab 4 project cards show Done.
- PRs #73–#83 were merged to `lab4-staging`; approved PR #84 merged staging to `main`. The review and merge records are in [`reviewer.md`](reviewer.md).
- The exact main source tree passed 164/164 server tests, 62/62 client tests, 20/20 Playwright tests, and both production builds. The test run used a clean archive of the recorded commit and tree. See [`tests.md`](tests.md) and the separate submission report for the run record.
- Migration recovery, repeatable seed behavior, responsive evidence capture, and dashboard performance were checked with disposable local data. No production data or shared database was used.
- All 53 indexed Lab 4 screenshots were reproduced from the final application source tree. UI captures use synthetic Playwright fixtures, not production data; the [screenshot index](../../artifacts/lab-04/screenshots/README.md) identifies each case and viewport.
- The separate course PDF contains Answer Parts 1–9 and is kept outside the repository. Its claims must be read with the exact source commit and dated GitHub evidence snapshots it identifies.
- The AI-use record names OpenAI Codex using GPT-6, includes eight selected prompt examples, and transparently identifies the reflection as AI-assisted wording based on the student's stated experience. The student should confirm that it accurately represents their learning before submission.

## Evidence provenance

The server and client suites/builds were initially reviewed on PR #80 head `c6aef91`; the full browser suite and screenshot capture ran on PR #81 head `fb0e13f`. Those runs established the candidate evidence before integration. The later final-main verification above reran the application suites, builds, performance smoke, and screenshot flow against the integrated source tree. The [Parts 1–9 evidence matrix](evidence-matrix.md) distinguishes these sources and records the final results.

The initial dashboard performance smoke on 2026-10-30 recorded Staff at 114.8 ms and Requester at 54.4 ms. The final-main rerun on 2026-10-31 recorded Staff at 78.7 ms and Requester at 18.7 ms with the same 8 and 6 entity-query counts. Both measurements used disposable PostgreSQL 16.15 data; they are local smoke results, not production service-level targets. Details are in [`performance-smoke.md`](performance-smoke.md).

## Submission artifact

The PDF is a separate course submission artifact, not a repository deliverable. Generate it from the accepted release evidence, preserve the exact `Answer Part 1` through `Answer Part 9` headings, and label any older GitHub page captures with their actual snapshot dates. Do not present a historical screenshot as current repository state.
