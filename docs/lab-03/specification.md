# Lab 3 Engineering Specification
## Sprint goal
Replace the temporary requester selector with secure local-lab authentication and deliver role-limited Requester, IT Staff, and Administrator workflows.
## Functional requirements
FR-01 Active users authenticate by email and password. FR-02 Initial passwords require change before normal access. FR-03 Requesters operate only on their own tickets. FR-04 IT Staff use a searchable, paginated queue and may claim, assign, prioritize, transition, comment, and add notes. FR-05 Administrators manage one-role accounts.
## Business rules
BR-01 Inactive and invalid accounts cannot authenticate. BR-02 Passwords are salted hashes only. BR-03 Server session identity determines ownership. BR-04 Public comments are shared; internal notes are staff-only. BR-05 Requesters cannot formally resolve or close. BR-06 A ticket has at most one active staff owner. BR-07 Only documented transitions are permitted. BR-08 Duplicate emails are rejected. BR-09 Administrators cannot deactivate themselves or remove the final active Administrator.
## Definition of done
Migration preserves Lab 2 data; all protected APIs authorize server-side; UI is responsive and Zen Green consistent; tests, builds, evidence, documentation, peer review, and final-main integration pass.

## Authorization matrix
| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Session, password change, logout | Allowed | Allowed | Allowed |
| Own ticket, attachment, public comment, resolved signal | Allowed | Allowed | Allowed |
| Internal Notes | Forbidden | Allowed | Allowed |
| Queue, claim, assignment, IT Priority, status transition | Forbidden | Allowed | Allowed |
| User list, create, edit, activation and role controls | Forbidden | Forbidden | Allowed |

## Contract decisions and acceptance criteria
AC-01 The six Lab 3 documents exist before implementation merges. AC-02 FR-01–FR-05 and BR-01–BR-09 map to tests. AC-03 every protected action is server-authorized through the matrix. AC-04 API, UI, migration, and tests are consistent. AC-05 the workflow is API-enforced.

SD-01 Passwords are unique-salt scrypt hashes only; safe responses never expose hashes or secrets. SD-02 invalid, unknown, and inactive login use one safe error. SD-03 random bearer sessions expire after eight hours and logout invalidates them. SD-04 initial accounts must set a 12+ character mixed-case/numeric password before normal access. SD-05 browser requester IDs never determine ownership.

WF-01 Tickets start NEW, unassigned, with IT Priority copied from requested priority. WF-02 permitted transitions are NEW→OPEN/CANCELLED; OPEN→IN_PROGRESS/WAITING_FOR_REQUESTER/RESOLVED/CANCELLED; IN_PROGRESS→WAITING_FOR_REQUESTER/RESOLVED/CANCELLED; WAITING_FOR_REQUESTER→IN_PROGRESS/RESOLVED/CANCELLED; RESOLVED→CLOSED/REOPENED; CLOSED→REOPENED; REOPENED→OPEN/IN_PROGRESS/CANCELLED. WF-03 only staff/admin may formally transition or alter owner/IT Priority. WF-04 comments and notes are append-only; notes remain staff/admin only.

MG-01 Migration adds users, workflow fields, comments, and notes without changing Lab 2 ticket/attachment records. MG-02 each Development Requester is linked to one User through legacyRequesterId. MG-03 idempotent seed provides four active/one inactive Requester, three active/one inactive IT Staff, and one active Administrator.

## Definition of Done
DOD-01 migration/seed preserve Lab 2 data; DOD-02 all server/client/API/E2E/responsive checks and production builds pass; DOD-03 role UI implements only this matrix; DOD-04 README, authentic peer review, final evidence, and Answer Part 1–9 PDF are complete; DOD-05 lab3-staging merges to main only after all prior items pass.
