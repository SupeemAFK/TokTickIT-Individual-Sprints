# Lab 2 Peer Review Record

## Reviewer

| Reviewer | GitHub account | Evidence |
|---|---|---|
| jarbbie | [@jarbbie](https://github.com/jarbbie) | Reviewed and approved the Lab 2 implementation PRs below. |

## Pull Requests I Authored

| Issue | PR | Review requests received | Response | Approval |
|---|---|---|---|---|
| 10 | [#22](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/22) | Add the complete proposed Prisma data design to the contract. | Expanded Section 7 with models, keys, relationships, constraints, indexes, soft removal, and migration/seed decisions. | Approved 2026-08-24. |
| 12 | [#23](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/23) | Make `Category.updatedAt` migration-safe for existing Lab 1 rows. | Added nullable column, backfill from `createdAt`, then enforced `NOT NULL`; verified against existing rows. | Approved 2026-08-24. |
| 11 | [#24](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/24) | No changes requested. | Requester API/selection context and tests reviewed as aligned. | Approved 2026-08-24. |
| 13 | [#25](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/25) | Correct test-results wording; return safe JSON for malformed ticket JSON. | Updated results record; added JSON parse-error middleware and regression test. | Approved 2026-08-25. |
| 14 | [#26](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/26) | Add read-only field treatment and duplicate-submission coverage. | Added visual treatment and deferred-request busy/disabled regression test. | Approved 2026-08-25. |
| 15 | [#27](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/27) | Require requester context; cover queries; reject oversized integer queries safely. | Added guards, query/boundary tests, and `Number.isSafeInteger` validation. | Approved 2026-08-25. |
| 16 | [#28](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/28) | Wire Ticket Detail navigation and make desktop opening keyboard accessible. | Added detail navigation, labelled native ticket-number button, and UI coverage. | Approved 2026-08-29. |
| 17 | [#29](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/29) | Validate active requester for detail and align contract evidence. | Added active-requester guard/test and corrected API/test documentation. | Approved 2026-08-30. |
| 18 | [#30](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/30) | Handle Multer size errors; complete attachment controls, creation-time upload, confirmation, and behavioral tests. | Added safe errors, upload/download/removal controls, creation-time upload, confirmation, and coverage. | Approved 2026-08-30. |
| 19 | [#31](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/31) | Use Secondary Green focus; remove overflow masking; add visual/style evidence for every screen and width. | Added focus token, removed global masking, style test, and populated 1440/768/375 artifacts. | Approved 2026-08-30. |
| 20 | [#32](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/32) | Scope the soft-removal assertion to the uploaded attachment. | Asserted the `evidence.png` row is removed and has no active actions; reran E2E. | Approved 2026-08-30. |

Each response was posted on its corresponding PR before re-review. The linked PR timelines are the source of truth for the full reviewer comments, response comments, approvals, commits, and merge records.

## Pull Requests I Reviewed for My Partner

No collaborator-authored Lab 2 pull request exists in this repository's PR history, so there is no genuine review authored by `SupeemAFK` to record. This is intentionally left as a transparent evidence gap rather than fabricated review feedback.
