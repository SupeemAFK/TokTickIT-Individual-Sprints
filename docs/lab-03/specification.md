# Lab 3 Sprint Engineering Specification

## 1. Sprint goal

Replace the Lab 2 Development Requester selector with secure local authentication and deliver role-limited Requester, IT Staff, and Administrator workflows. Existing Lab 2 tickets and attachments must remain usable after the additive database migration.

## 2. Stakeholder request interpretation

The service desk now needs real local users instead of a testing selector. Requesters must continue managing their own tickets, IT Staff must have an operational queue and ticket workflow, and Administrators must manage simple user accounts. Every protected action must be authorized by the server.

## 3. Scope

### Included

- Email/password login, logout, current-user retrieval, opaque bearer sessions, and mandatory first-login password change.
- Requester, IT Staff, and Administrator roles with server-side authorization.
- Migration/backfill from `DevelopmentRequester` to `User` without changing existing Ticket or Attachment ownership.
- Authenticated Lab 2 Requester ticket, attachment, search/filter/sort/pagination, Public Comment, and resolution-signal behavior.
- IT Staff queue, detail, ownership, IT Priority, permitted status transitions, Public Comments, Internal Notes, and authorized attachments.
- Minimal Administrator user listing, search, optional role filter, create, edit, activation, role, and initial-password reset.
- Idempotent local seed data, API/UI/unit/integration/E2E tests, responsive evidence, peer review, and final release integration.

### Excluded

- Email invitations, password-reset email, MFA, social login, SSO, self-registration, and user deletion.
- Actions Taken, SLA/escalation/notification services, dashboards/KPIs, departments, organizations, profile photos, role history, and audit-history screens.
- Multiple roles per user, bulk operations, import/export, advanced sorting/filtering, and production/cloud deployment.

## 4. Functional requirements

- **FR-01 Authentication:** An active user can log in with email and password and receive a safe authenticated session.
- **FR-02 First login:** A user with `mustChangePassword` cannot use normal application APIs until a valid new password is saved.
- **FR-03 Session:** An authenticated user can retrieve their own safe identity and role and can log out, invalidating the session.
- **FR-04 Role shell:** The UI displays only the navigation and actions allowed for the authenticated role.
- **FR-05 Requester ownership:** Requester operations derive ownership from the session, never from a client-supplied requester ID.
- **FR-06 Requester regression:** Requesters can create, list, search, filter, sort, paginate, view, and manage permitted attachments for their own tickets.
- **FR-07 Requester communication:** Requesters can read/create Public Comments on owned tickets and submit a Problem Appears Resolved signal, but cannot formally resolve or close tickets.
- **FR-08 Staff queue:** IT Staff and permitted Administrators can search, filter, sort, paginate, and open tickets from a responsive queue.
- **FR-09 Staff operations:** IT Staff and Administrators can claim/reassign tickets, set IT Priority, perform permitted status changes, create/read Public Comments, and create/read Internal Notes.
- **FR-10 Note privacy:** Internal Notes are never returned to Requesters.
- **FR-11 Administrator management:** Administrators can list/search users, optionally filter by role, create/edit one-role accounts, activate/deactivate accounts, and set an initial password.
- **FR-12 Migration and seed:** Existing ownership survives migration; the seed is idempotent and supplies realistic accounts and workflow data.

## 5. Roles and authorization matrix

| Operation | Requester | IT Staff | Administrator |
|---|---:|---:|---:|
| Login, logout, `/me`, password change | Yes | Yes | Yes |
| Own tickets and permitted attachments | Yes | No by requester route | No by requester route |
| Public Comments | Own tickets | Queue tickets | Queue tickets |
| Problem Appears Resolved | Own tickets | No | No |
| Staff queue and ticket detail | No | Yes | Yes, for operational visibility |
| Claim/assign, IT Priority, status | No | Yes | Yes |
| Internal Notes | No | Yes | Yes |
| User list/create/edit/activation/role/reset | No | No | Yes |

The backend enforces this matrix. Hidden or disabled UI controls are only usability feedback and are not security controls. For this Lab 3 contract, Administrators are explicitly permitted to perform the listed staff-ticket operations; this does not give IT Staff any Administrator user-management permissions.

## 6. Business rules

- **BR-01** Only an active user with valid credentials can authenticate; invalid, unknown, and inactive login failures use one safe message.
- **BR-02** Passwords are stored only as unique-salt scrypt hashes. Hashes, salts, bearer tokens, and initial passwords are never returned to clients.
- **BR-03** Sessions are random opaque bearer values, stored as hashes, expire after eight hours, and are invalidated by logout.
- **BR-04** First-login passwords must be replaced with a 12+ character password containing upper case, lower case, and numeric characters.
- **BR-05** A session identity, not a requester ID supplied by the browser, determines Requester ownership.
- **BR-06** Missing or non-owned protected tickets and attachments return safe 404 responses without disclosing another user's data.
- **BR-07** New tickets start `NEW`, unassigned, and their `itPriority` copies `requestedPriority`.
- **BR-08** A ticket has at most one active owner, and an owner must be an active IT Staff or Administrator.
- **BR-08a** An Administrator cannot deactivate or demote an IT Staff/Administrator user who owns any ticket, including a `CLOSED` ticket. The API rejects the complete account update with `409 OWNER_INTEGRITY_CONFLICT`; no partial change is saved. Reassignment/clearing is a separate explicit staff operation.
- **BR-09** Permitted transitions are `NEW→OPEN|IN_PROGRESS|CANCELLED`; `OPEN→IN_PROGRESS|WAITING_FOR_REQUESTER|RESOLVED|CANCELLED`; `IN_PROGRESS→WAITING_FOR_REQUESTER|RESOLVED|CANCELLED`; `WAITING_FOR_REQUESTER→IN_PROGRESS|RESOLVED|CANCELLED`; `RESOLVED→CLOSED|REOPENED`; `CLOSED→REOPENED`; `REOPENED→IN_PROGRESS|WAITING_FOR_REQUESTER|RESOLVED|CANCELLED`.
- **BR-10** Only IT Staff and Administrators can change owner, IT Priority, or formal status.
- **BR-11** Public Comments are visible to Requesters, IT Staff, and Administrators; Internal Notes are visible only to IT Staff and Administrators.
- **BR-12** Comments and notes are append-only, record backend author/time, reject whitespace-only content, and are safely rendered as text.
- **BR-13** Duplicate email addresses and invalid role values are rejected.
- **BR-14** Each User has exactly one role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
- **BR-15** Administrators cannot deactivate themselves or remove/deactivate the final active Administrator.
- **BR-16** Users are deactivated rather than deleted.
- **BR-17** A Requester role always has one linked legacy `DevelopmentRequester`; edits update the existing link so ticket ownership is preserved.
- **BR-18** Seed execution is idempotent, preserves existing password hashes, creates realistic varied ticket data, and does not store real secrets.
- **BR-19** Invalid input returns 400, unauthenticated access 401, forbidden access 403, missing protected resources 404, conflicts 409, and unexpected failures a generic 500. A malformed/unknown transition value is `400`; a valid status that is not allowed from the current status is `409`.
- **BR-20** Every protected API validates IDs, query parameters, role, ownership, and state transitions on the server.

## 7. Data and migration decisions

The migration is additive and must not discard Lab 2 `Ticket`, `Attachment`, `Category`, `RelatedSystem`, or `DevelopmentRequester` rows.

| Model | Required concepts |
|---|---|
| `User` | id, name, unique email, password hash, role enum, active state, `mustChangePassword`, nullable unique `legacyRequesterId` FK, timestamps |
| `Session` | id, hashed bearer token, user, created/expiry timestamps, revoked timestamp |
| `DevelopmentRequester` | Existing row remains the owner target for `Ticket.requesterId`; add inverse optional one-to-one `user User?` relation. Existing Ticket requester IDs remain unchanged. |
| `Ticket` | Existing fields plus nullable owner User, `itPriority`, requester-resolution signal/timestamp, and workflow fields required by the API |
| `PublicComment` | ticket, author User, trimmed content, backend timestamp |
| `InternalNote` | ticket, author User, trimmed content, backend timestamp |
| `Attachment` | Existing metadata and ownership rules preserved; staff/admin authorized reads/downloads added |

The exact relationship is `User.legacyRequesterId Int? @unique` as a nullable foreign key from `User` to `DevelopmentRequester.id`, with the inverse optional one-to-one `DevelopmentRequester.user User?`. It is logically required when `User.role=REQUESTER` and null for new IT Staff/Administrators. The relation uses `onDelete: Restrict`; users are not deleted and legacy requester rows are never cascaded away. Existing `Ticket.requesterId Int` continues to reference `DevelopmentRequester.id` with `onDelete: Restrict`, so ticket ownership cannot drift.

Existing Development Requesters are backfilled exactly once by creating one linked User per unlinked row. Existing Ticket requester IDs are not rewritten. A new Requester account creates a new DevelopmentRequester and User in one transaction. Editing a linked Requester updates the existing User and DevelopmentRequester rows in one transaction. If a Requester role is removed, the link is retained to preserve history; the user loses requester access until the role is restored, and another User cannot claim that linked legacy row. If an IT Staff or Administrator changes to `REQUESTER`, an existing retained link is reused; otherwise one new DevelopmentRequester is created and linked in the same transaction. The linked row is synchronized with the User name, email, and activation state. The role change is rejected by the owner-integrity rule before mutation when the user owns any ticket. All role/link/ticket checks fail atomically.

The idempotent seed provides at least four active and one inactive Requester, three active and one inactive IT Staff, and one active Administrator, plus tickets distributed across Requesters, statuses, priorities, assigned/unassigned ownership, Public Comments, and Internal Notes.
For local development only, every seeded account starts with the documented initial password `Lab3Pass123` and `mustChangePassword=true`. The implementation PR must add a `Lab 3 local seed accounts` section to `README.md` and the final evidence record; this value is never used as a production secret and is never returned by an API.

## 8. UI summary

The authenticated shell shows the current user's name and role, role-appropriate navigation, logout, and safe loading/error states. Login and Change Password have labelled fields, validation, busy states, safe failure feedback, and accessible focus. Requester, Staff Queue, Staff Ticket Detail, and Administrator User Management screens reuse the Lab 2 Zen Green tokens and responsive rules. Full layout, modes, feedback, accessibility, and responsive decisions are in [ui-spec.md](ui-spec.md).

## 9. Acceptance criteria

- **AC-01** Active valid credentials establish a session and return only safe user identity/role data.
- **AC-02** Invalid or inactive credentials fail safely; the inactive account is not distinguished unnecessarily.
- **AC-03** A first-login user can access only `/me` and password change until a valid password is saved.
- **AC-04** Logout invalidates the bearer session and blocks subsequent protected access.
- **AC-05** A Requester cannot access another Requester's ticket, attachment, comment, or note by changing client parameters.
- **AC-06** Lab 2 Requester creation/list/detail/attachment behavior remains available under session-owned identity.
- **AC-07** Requesters can create Public Comments and a resolution signal but cannot formally resolve or close.
- **AC-08** Staff queue search/filter/sort/pagination and ownership/status/priority data work with safe invalid-query errors.
- **AC-09** Staff can claim/reassign, change IT Priority, follow the transition matrix, comment publicly, and add private notes.
- **AC-10** Public Comments are shared and Internal Notes are staff/admin-only at both API and UI layers.
- **AC-11** Administrators can safely list, search, create, edit, activate/deactivate, role-change, and reset initial passwords for users.
- **AC-12** Duplicate emails, invalid roles, self-deactivation, and final-active-Administrator removal are rejected.
- **AC-13** Migration/backfill preserves existing ticket ownership and repeated seed runs do not duplicate or corrupt records.
- **AC-14** All major screens work at desktop, tablet, and mobile widths with no clipping or horizontal overflow.
- **AC-15** Every criterion maps to planned tests, and the final API/UI/E2E/build suite passes from `main`.
- **AC-16** Final evidence contains authentic review links, readable screenshots, and exactly Answer Part 1 through Answer Part 9 in one PDF.
- **AC-17** An Administrator cannot deactivate or demote any user who owns a ticket, including a `CLOSED` ticket; the API returns `409 OWNER_INTEGRITY_CONFLICT` and leaves the account and owner unchanged.

## 10. Definition of Done

- Contract files were committed before implementation PRs are merged.
- All FR, BR, and AC items are implemented, tested, and traceable.
- Migration/backfill preserves Lab 2 data and seed is idempotent.
- Seed tests verify a fresh database creates assigned workflow tickets, Public Comments, and Internal Notes on the first run and remains unchanged on a second run.
- Server and client tests, builds, authorization tests, responsive checks, and E2E tests pass with no skipped required coverage.
- Role navigation, loading, validation, success, empty, no-result, forbidden, not-found, conflict, and safe-failure states are verified.
- Each feature branch has a reviewed PR into `lab3-staging`.
- A collaborator approves the final staging-to-main PR.
- Final screenshots, `reviewer.md`, `ai-use.md`, README, and one Answer Parts 1–9 PDF match the final `main` commit.
- Issues #35–#42 are moved to Done only after final-main verification.

## 11. Branch and integration decisions

The clean flow is `main` → `lab3-staging` → feature branches/PRs → `lab3-staging` → reviewed PR → `main`. The new restart uses `lab3-staging` and feature branches created from it. Old Lab 3 branches are retained as historical references and are not merged into this restart.

## 12. Deferred Lab 4 work

Actions Taken, SLA/escalation, notification delivery, advanced identity management, and the later resolution rule involving incomplete Actions Taken are intentionally deferred.
