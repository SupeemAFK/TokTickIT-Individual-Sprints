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

| Collaborator PR | Review authored by SupeemAFK | Author response | Outcome |
|---|---|---|---|
| [jarbbie/toktickit #17](https://github.com/jarbbie/toktickit/pull/17) | [Requested changes](https://github.com/jarbbie/toktickit/pull/17#pullrequestreview-5009094114): complete AI-use/reviewer records and add duplicate-number retry rule. | [Addressed in 4d78b91](https://github.com/jarbbie/toktickit/pull/17#issuecomment-5397341940). | [Approved](https://github.com/jarbbie/toktickit/pull/17#pullrequestreview-5009523102). |
| [jarbbie/toktickit #20](https://github.com/jarbbie/toktickit/pull/20) | [Approved](https://github.com/jarbbie/toktickit/pull/20#pullrequestreview-5014552832) the data foundation after schema, seed, and ignore-rule checks. | No changes requested. | Merged 2026-08-25. |
| [jarbbie/toktickit #21](https://github.com/jarbbie/toktickit/pull/21) | [Approved](https://github.com/jarbbie/toktickit/pull/21#pullrequestreview-5017914685) requester context/reference data after UI test/build checks. | No changes requested. | Merged 2026-08-25. |
| [jarbbie/toktickit #22](https://github.com/jarbbie/toktickit/pull/22) | [Approved](https://github.com/jarbbie/toktickit/pull/22#pullrequestreview-5021072031) ticket creation API validation, safe errors, number retry, and tests. | No changes requested. | Merged 2026-08-25. |
| [jarbbie/toktickit #23](https://github.com/jarbbie/toktickit/pull/23) | [Approved](https://github.com/jarbbie/toktickit/pull/23#pullrequestreview-5042631467) Create Ticket UI state handling and navigation. | No changes requested. | Merged 2026-08-27. |
| [jarbbie/toktickit #24](https://github.com/jarbbie/toktickit/pull/24) | [Requested changes](https://github.com/jarbbie/toktickit/pull/24#pullrequestreview-5057459487): preserve pagination page and validate active requester before listing. | [Fixed with tests](https://github.com/jarbbie/toktickit/pull/24#issuecomment-5461792431). | [Approved](https://github.com/jarbbie/toktickit/pull/24#pullrequestreview-5058186008). |
| [jarbbie/toktickit #25](https://github.com/jarbbie/toktickit/pull/25) | [Requested changes](https://github.com/jarbbie/toktickit/pull/25#pullrequestreview-5060414260): verify attachment signatures and serialize the active-file limit. | [Fixed with signature/concurrency tests](https://github.com/jarbbie/toktickit/pull/25#issuecomment-5467906241). | [Approved](https://github.com/jarbbie/toktickit/pull/25#pullrequestreview-5060452128). |
| [jarbbie/toktickit #26](https://github.com/jarbbie/toktickit/pull/26) | [Requested changes](https://github.com/jarbbie/toktickit/pull/26#pullrequestreview-5060562730): add active-attachment download E2E evidence. | [Added download test and screenshot](https://github.com/jarbbie/toktickit/pull/26#issuecomment-5468203341). | [Approved](https://github.com/jarbbie/toktickit/pull/26#pullrequestreview-5060583263). |

These are genuine Lab 2 reviews on the collaborator repository. The linked review comments, author responses, approvals, and merged PR timelines are the source of truth.
