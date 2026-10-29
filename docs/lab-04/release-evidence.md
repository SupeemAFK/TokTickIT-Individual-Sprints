# Lab 4 Release Evidence Checklist

This checklist distinguishes completed staging evidence from work that depends on collaborator review and final `main` integration. It is not a claim that the release is complete.

## Staging evidence

- [x] Contract, API/UI specifications, and acceptance traceability are versioned under `docs/lab-04/`.
- [x] Issues #64–#71 have focused, issue-linked PRs merged to `lab4-staging`; actual review history is in [`reviewer.md`](reviewer.md).
- [x] Lab 4 AI use and selected prompt traceability are recorded in [`ai-use.md`](ai-use.md). The reflection remains a draft for student review.
- [x] Server/client regression suites and builds passed on PR #80 head `c6aef91`; the approved PR merged to staging as `2d8db4f`. See [`tests.md`](tests.md) for the tested commits and the later evidence-only changes.
- [x] Migration and dashboard performance checks ran against disposable PostgreSQL 16.15 using temporary schemas; no remote database or public schema was changed.
- [x] Staff and Requester dashboards and Staff Ticket Detail were captured and visually inspected at 375, 768, and 1440 px. See the [screenshot index](../../artifacts/lab-04/screenshots/README.md).
- [x] The complete existing Lab 1–4 Playwright suite passed on PR #81's evidence-capture commit `fb0e13f`: 20 tests, including Action Taken create/edit/status/cancel/error/empty states, requester read-only history, dashboard loading/empty/forbidden/failure states, and ticket-resolution conflict/recovery. Later PR #81 changes were documentation and rendered screenshots; the reviewer recorded that the suite was not rerun for those evidence-only changes.
- [x] PR #81 received collaborator approval at `f081efc` and merged into `lab4-staging` as `3fa0743`. The actual review, response, and merge history is recorded in [`reviewer.md`](reviewer.md).
- [x] The post-merge evidence refresh in PR #82 was approved at `75cd4e7` and merged into `lab4-staging` as `d1be4b0`; its refreshed captures and review are recorded in [`reviewer.md`](reviewer.md).
- [x] The [Parts 1–9 evidence matrix](evidence-matrix.md) and [visual/accessibility review](visual-review.md) map screenshots, test records, and remaining release work to the handout.
- [x] README setup, migration, seed, test, and demo instructions describe the integrated Labs 1–4 application.

## Pending integration and final release

- [ ] Open the final `lab4-staging` to `main` PR for collaborator review and merge.
- [ ] On the resulting exact `main` commit, rerun server and client tests/builds and the complete Playwright suite; inspect the final screenshots and record the commit hash and actual outputs.
- [ ] Change issue #72's project status from `Done` to `In Progress` while the final release gates remain pending; mark it `Done` only after final-main verification and the submission PDF meet the acceptance criteria.
- [ ] Prepare the separate concise PDF with exactly `Answer Part 1` through `Answer Part 9`, working references, readable screenshots, and claims checked against final `main`. Do not commit the submission PDF to this repository.

## Verified staging snapshot

After PR #82 merged, `origin/lab4-staging` was `d1be4b07f270453b8fb398dc0618ffda2dba0f93`, the merge commit for approved PR #82. The server/client regression evidence is from tested PR #80 head `c6aef91`; the full Playwright evidence run is from PR #81 capture commit `fb0e13f`. PRs #81 and #82 made documentation and screenshot updates after those runs. This is staging evidence, not final-main verification.
