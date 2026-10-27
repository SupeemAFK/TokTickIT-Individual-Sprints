# Lab 4 Sprint Engineering Specification

## 1. Sprint goal

Complete the core TokTickIT service-desk workflow by recording and assigning staff work under Tickets, enforcing safe resolution, and giving Requesters and service-desk staff concise dashboards. Preserve the authenticated Lab 3 application and its Zen Green UI.

## 2. Stakeholder request

IT Staff need to record what they did, the result, follow-up, and attachment context for each Ticket. A Ticket Owner coordinates the overall Ticket while individual actions may be assigned to and performed by different staff. Requesters need a clear view of their own work; staff need an operational view of the queue and their assigned actions.

## 3. Scope

### Included

- Multiple Actions Taken per Ticket, including staff assignment and server-derived performer.
- Backend authorization, validation, idempotent create behavior, and stale-update conflicts.
- The existing Ticket transition matrix with a backend resolution gate.
- Staff/Admin and Requester dashboards with explicit calculations and Ticket drill-down.
- Idempotent seed data, additive Prisma migration, Labs 1–3 regression, accessible/responsive UI, and release evidence.

### Excluded

SLA clocks, escalations, notifications, on-call scheduling, inventory or purchasing, labor billing, multi-level approvals, external services, report builders, production-scale hosting, file uploads for actions, new roles, and unrelated redesign/refactoring. Attachment Notes describe where an existing file can be found; they do not upload or attach a file.

## 4. Functional requirements

- **FR-01 Actions Taken:** Staff/Admin can list, create, assign, edit, transition, complete, and cancel actions on an eligible Ticket. A Ticket may have zero or many actions.
- **FR-02 Action record:** Each action contains Action Date/Time, Action Description, Result, status, Follow-Up Required, conditional Follow-up Note, Attachment Notes, assigned staff (optional), authenticated performer (automatic), and created/updated timestamps.
- **FR-03 Requester visibility:** A Requester can read action history only on their own Ticket. Requesters cannot create, assign, edit, transition, complete, or cancel actions.
- **FR-04 Ticket workflow:** Keep the Lab 3 Ticket transition matrix. Staff/Admin formally change Ticket status. A Requester resolution indication remains advisory. The backend rejects resolution while an action is OPEN or IN_PROGRESS.
- **FR-05 Dashboards:** Provide authoritative staff and Requester metrics, concise recent-work lists, empty states, and links to existing detail/queue views.
- **FR-06 Preservation:** Keep all existing authentication, ownership, comments, private notes, attachments, queue, user administration, and Ticket lifecycle behavior working.
- **FR-07 Hardening:** Provide loading, validation, success, empty, forbidden, not-found, conflict, and safe-failure feedback; prevent duplicate action submissions; preserve form values after recoverable errors.
- **FR-08 Evidence:** Keep this contract, the API/UI specifications, an AC-to-test plan, review/AI-use records, and readable screenshots. The separately submitted one-PDF artifact is not committed.

## 5. Roles and authorization

| Operation | Requester | IT Staff | Administrator |
|---|---:|---:|---:|
| Read own dashboard and own Ticket actions | Yes | No | No |
| Read staff dashboard and operational actions | No | Yes | Yes |
| Create/edit/assign/change/cancel an action | No | Yes | Yes |
| Change Ticket owner, priority, or formal status | No | Yes | Yes |
| Indicate that own issue appears resolved | Advisory only | No | No |

Every write permission and ownership check is enforced by the API. UI visibility is not authorization. The performer is always the authenticated staff/admin account; the Ticket Owner, action assignee, and performer are separate identities.

## 6. Business rules

- **BR-01 Parent-child:** Each Action Taken belongs to exactly one Ticket. A Ticket can have zero or many actions.
- **BR-02 Ownership:** Ticket Owner coordinates the Ticket. An action can be assigned to or performed by a different staff member.
- **BR-03 Performer:** On creation, the backend sets Performed By from the authenticated session. Clients cannot set or change it.
- **BR-04 Assignee:** An action may be unassigned. A non-null assignee must be an active IT Staff or Administrator account. Inactive, missing, or Requester accounts are rejected by the backend.
- **BR-05 Fields:** Action Date/Time is an ISO-8601 instant with an explicit offset and is stored as UTC. Description and Result are trimmed and 1–2,000 characters. Follow-up Note is trimmed and 1–1,000 characters when required. Attachment Notes are nullable and at most 1,000 characters. Whitespace-only required values fail.
- **BR-06 Action states:** A new action starts OPEN. The allowed transitions are OPEN → IN_PROGRESS, COMPLETED, or CANCELLED; IN_PROGRESS → COMPLETED or CANCELLED. COMPLETED and CANCELLED are terminal. Terminal actions are read-only.
- **BR-07 Eligible Ticket:** Action writes are allowed only while the parent Ticket is in an active status: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, or REOPENED. Terminal Ticket statuses remain readable.
- **BR-08 Ticket states:** The complete matrix is: NEW → OPEN, IN_PROGRESS, CANCELLED; OPEN → IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED; IN_PROGRESS → WAITING_FOR_REQUESTER, RESOLVED, CANCELLED; WAITING_FOR_REQUESTER → IN_PROGRESS, RESOLVED, CANCELLED; RESOLVED → CLOSED, REOPENED; CLOSED → REOPENED; REOPENED → IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED; CANCELLED has no outgoing transition.
- **BR-09 Resolution gate:** Any transition to RESOLVED fails with 409 ACTIONS_INCOMPLETE when at least one action is OPEN or IN_PROGRESS. A legacy Ticket with no actions remains resolvable. COMPLETED and CANCELLED actions do not block resolution.
- **BR-10 Resolution time:** Set resolvedAt when a Ticket enters RESOLVED; retain it on CLOSED; clear it on REOPENED or any allowed transition to a non-resolved active/cancelled state. Existing RESOLVED Tickets are backfilled from updatedAt as an explicitly approximate date because prior status history was not stored.
- **BR-11 Requester signal:** A Requester’s “appears resolved” signal is advisory and never changes currentStatus to RESOLVED.
- **BR-12 Staff metrics:** Active Tickets are NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, or REOPENED. Calculate unassigned active Tickets where ownerUserId is null; current-user owned active Tickets where ownerUserId matches the session; active counts by each status and IT Priority; and waiting Tickets by exact status. Count the current user’s active Actions Taken where assignedToUserId matches the session and action status is OPEN or IN_PROGRESS. Count resolved in the last seven rolling 24-hour days by resolvedAt, inclusive at now minus seven days and exclusive at now.
- **BR-13 Requester metrics:** Every query is scoped to the session-linked Requester. Calculate total Tickets, active Tickets using BR-12’s status set, tickets waiting for the Requester, and tickets resolved in the last 30 rolling 24-hour days by resolvedAt. Return up to ten most recently updated own Tickets and up to ten most recently resolved own Tickets in that window.
- **BR-14 Time and ordering:** Store/compare timestamps as UTC instants. Render in the viewer’s local time zone. Action history orders by actionAt ascending then ID ascending. Dashboard recent lists order by their relevant timestamp descending then ID descending. All empty metrics are zero, all status/priority buckets are explicit, and empty lists are [].
- **BR-15 Safe concurrency:** Ticket status requests include expectedCurrentStatus and return 409 if it differs from the current row. Action edits/cancellation include expectedUpdatedAt; stale writes return 409 without overwriting newer work. Action writes and resolution checks serialize on the parent Ticket row so an action cannot race past the resolution gate. A write that loses the race returns a safe 409 and changes nothing.
- **BR-16 Duplicate creation:** Each create request carries an Idempotency-Key and the server stores a hash of the normalized payload. Repeating the same key, actor, Ticket, and payload returns the already-created action; reusing it with a different actor, Ticket, or payload returns a safe conflict. The UI retains the key after ambiguous network failure and creates a fresh key only after success/reset.

### Data and migration decisions

1. ActionTaken is a child table with a cascading Ticket foreign key. Its required performer foreign key is restrictive, preserving who performed historical work. The optional assignee foreign key is set null if the staff account is later removed; account deactivation remains preferred to deletion.
2. Store the performing User and assigned User separately from Ticket.ownerUserId. This supports coordinated ownership and distributed action work without confusing accountability.
3. Store resolvedAt separately from updatedAt. Closing a resolved Ticket changes updatedAt but should not change the time it was resolved; an index supports the rolling resolved metrics.
4. Persist a unique create idempotency key and immutable hash of the normalized create payload on each ActionTaken. This makes a retry safe even if the action is edited after the original create.
5. The migration is additive: create the action enum/table/indexes, add resolvedAt, and backfill existing RESOLVED rows from updatedAt. It does not rewrite or remove earlier Ticket, User, Attachment, Public Comment, or Internal Note rows.
6. Before deployment, back up the database. Do not run an automatic destructive down migration after action data may exist. If migration fails before application writes, restore the pre-migration backup. After writes, prefer a forward fix; restore only with an explicit reconciliation plan for post-backup actions. Exercise migration and recovery on a disposable database before release.
7. Seeds use stable keys/upserts and cover every Ticket status and priority, owned/unowned Tickets, zero/one/multiple actions, different owner/assignee/performer combinations, active and terminal action statuses, and non-zero and zero dashboard cases.

## 7. Dashboard definitions

All counts are backend database queries over the full authorized dataset, independent of page size.

| Dashboard | Metric/list | Calculation and empty behavior | Drill-down |
|---|---|---|---|
| Staff | Active Tickets | Count statuses in BR-12; zero when none | Staff Queue, active status group |
| Staff | Unassigned active | Active Tickets with no owner; zero when none | Staff Queue, active group and ownerUserId=null |
| Staff | Owned by me | Active Tickets with ownerUserId=session user; zero when none | Staff Queue, active group and ownerUserId=session user |
| Staff | Active by status / IT Priority | Group active Tickets; include every active status and LOW/MEDIUM/HIGH with zero buckets | Queue filtered by status or priority |
| Staff | Waiting for Requester | Exact status count | Queue status=WAITING_FOR_REQUESTER |
| Staff | Resolved in last 7 days | resolvedAt in [now-7d, now), including Tickets later moved to CLOSED | Summary card is informational; matching Ticket rows in Recently updated open their detail |
| Staff | My active actions | Assigned to session user and status OPEN/IN_PROGRESS; return count and up to ten oldest actionAt then ID | Each action opens its parent Ticket detail |
| Staff | Recently updated | Up to ten Tickets by updatedAt descending then ID descending | Each Ticket opens its detail |
| Requester | Total Tickets | Count all Tickets owned by session-linked Requester | My Tickets |
| Requester | Active Tickets | Count statuses in BR-12 | My Tickets, active group |
| Requester | Waiting for you | Exact status count | My Tickets, WAITING_FOR_REQUESTER |
| Requester | Resolved in last 30 days | resolvedAt in [now-30d, now) | Recent resolved Ticket list |
| Requester | Recently updated / resolved | Up to ten own Tickets, ordered by updatedAt / resolvedAt descending then ID descending | Each Ticket opens own detail |

“Active group” is an additive queue filter for the active statuses defined in BR-12. Summary cards without an exact existing list filter remain non-interactive; every listed Ticket/action is a drill-down. Requester lists and counts must never include another Requester’s data.

## 8. Acceptance criteria

- **AC-01** Given a migrated database, existing records remain intact and legacy RESOLVED Tickets receive the documented approximate resolvedAt.
- **AC-02** Given an authorized staff user, creating an action stores the correct Ticket, authenticated performer, optional active assignee, and submitted work fields.
- **AC-03** Ticket Owner, action assignee, and performer may differ and are returned distinctly.
- **AC-04** Invalid fields, inactive/non-staff assignees, and missing conditional follow-up notes are rejected safely.
- **AC-05** Action transitions follow BR-06; completed/cancelled actions cannot be edited.
- **AC-06** Requesters read all actions on their own Tickets only and cannot write actions, even by direct API call.
- **AC-07** The Ticket matrix in BR-08 is preserved and enforced by the API; Requester resolution feedback remains advisory.
- **AC-08** OPEN/IN_PROGRESS actions block resolution; zero-action legacy Tickets and Tickets with only terminal actions can resolve.
- **AC-09** resolvedAt follows BR-10 across resolve, close, and reopen operations.
- **AC-10** Staff dashboard metrics/lists match BR-12 and include current-user assigned Actions Taken.
- **AC-11** Requester dashboard metrics/lists match BR-13 and contain only session-owned Tickets.
- **AC-12** Lists and useful metrics drill into authorized existing detail/queue views; empty and zero states are explicit.
- **AC-13** Stale updates and repeated creates follow BR-15/BR-16 without silent overwrites or duplicate actions.
- **AC-14** Seed execution is repeatable and supplies all required demo combinations.
- **AC-15** Labs 1–3 behavior remains available and authorized; full server/client/E2E regression passes.
- **AC-16** Zen Green UI is keyboard accessible and responsive at 375, 768, and 1440 px, with no clipping or horizontal page overflow.
- **AC-17** Test traceability, actual results, reviewer/AI-use records, and readable evidence match the candidate commit. No review approval or passing result is claimed before it occurs.

## 9. Definition of Done

- Contract and test plan are committed before implementation PRs.
- Issues #64–#72 map to focused, issue-linked branches and PRs.
- Each issue PR targets lab4-staging, passes its focused checks, and is peer-reviewed before merge.
- Full regression/build/E2E checks pass on the integrated candidate; responsive screenshots are visually inspected.
- Migration preservation/recovery is exercised on a disposable database or the unavailable live check is explicitly recorded.
- Reviewer records contain the actual reviewer, PR links, comments, responses, and approval only after they occur.
- The final lab4-staging-to-main PR is reviewed and merged by the human collaborator. The single Answer Part 1–9 PDF is prepared separately from the final main commit.

## 10. Git workflow

Create lab4-staging from origin/main. For each issue, branch from the latest lab4-staging using <type>/<issue>-<topic> names, such as docs/64-engineering-contract, feat/65-action-taken-model, fix/67-ticket-resolution-guard, test/71-regression-hardening, and chore/72-release-evidence. Use Conventional Commit subjects such as docs(contract): define acceptance criteria, feat(actions): add action assignment, fix(workflow): block unsafe resolution, test(regression): cover legacy flows, and chore(evidence): record final results. Reference the issue in the PR body. Open each issue PR to lab4-staging and stop for collaborator review/merge. After #64–#72 are integrated, open one final lab4-staging-to-main PR and leave it for the collaborator to review and merge. Never commit directly to main.
