# Lab 4 Release Evidence Checklist

This checklist distinguishes completed staging evidence from work that depends on collaborator review and final `main` integration. It is not a claim that the release is complete.

## Staging evidence

- [x] Contract, API/UI specifications, and acceptance traceability are versioned under `docs/lab-04/`.
- [x] Issues #64–#71 have focused, issue-linked PRs merged to `lab4-staging`; actual review history is in [`reviewer.md`](reviewer.md).
- [x] Lab 4 AI use and selected prompt traceability are recorded in [`ai-use.md`](ai-use.md). The reflection remains a draft for student review.
- [x] Regression suites and builds passed on PR #80 head `c6aef91`; the approved PR merged to staging as `2d8db4f`. See [`tests.md`](tests.md).
- [x] Migration and dashboard performance checks ran against disposable PostgreSQL 16.15 using temporary schemas; no remote database or public schema was changed.
- [x] Staff and Requester dashboards and Staff Ticket Detail were captured and visually inspected at 375, 768, and 1440 px. See the [screenshot index](../../artifacts/lab-04/screenshots/README.md).
- [x] README setup, migration, seed, test, and demo instructions describe the integrated Labs 1–4 application.

## Pending collaborator review and final release

- [ ] Complete collaborator review of [PR #81](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/81), merge it to `lab4-staging`, and add the actual review, response, and merge details to `reviewer.md` after they occur.
- [ ] Open the final `lab4-staging` to `main` PR only after issue PRs #64–#72 are integrated. Leave that PR for collaborator review and merge.
- [ ] On the resulting exact `main` commit, rerun server and client tests/builds and the complete Playwright suite; inspect the final screenshots and record the commit hash and actual outputs.
- [ ] Update the GitHub Lab 4 project/Kanban only when all acceptance criteria and final-main verification are complete.
- [ ] Prepare the separate concise PDF with exactly `Answer Part 1` through `Answer Part 9`, working references, readable screenshots, and claims checked against final `main`. Do not commit the submission PDF to this repository.

## Verified staging snapshot

At the start of issue #72, `origin/lab4-staging` was `2d8db4fa26e5e293d4ce1b7228b5a778370d5da4`, the merge commit for approved PR #80. The full regression evidence is from the tested PR head `c6aef91`; the resulting staging tree contains that tested content. This is staging evidence, not final-main verification.
