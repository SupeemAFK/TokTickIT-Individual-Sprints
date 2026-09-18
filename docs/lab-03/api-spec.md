# Lab 3 API Contract

All JSON responses use `{ "error": "Safe message." }` for errors. Protected routes require `Authorization: Bearer <session-token>`. Session tokens are opaque, random, short-lived credentials; the API never returns token hashes, password hashes, salts, or initial passwords.

## Authentication

| Purpose | Method and path | Success | Important failures |
|---|---|---|---|
| Login | `POST /api/auth/login` | `200 { user, session: { token, expiresAt } }` | `401` safe invalid/inactive credentials, `400` malformed input |
| Current user | `GET /api/auth/me` | `200 { user, mustChangePassword }` | `401` missing/invalid/expired session |
| Change initial password | `POST /api/auth/change-password` | `200 { user, mustChangePassword:false }` | `401`, `403` if not first-login-eligible, `400` password rules |
| Logout | `POST /api/auth/logout` | `204` | `401` invalid/missing session |

Login accepts `{ "email": "requester@example.test", "password": "..." }`. The safe User shape is `{ id, name, email, role, isActive }`. A valid first-login session may call `/me` and `/change-password`, but receives `403 PASSWORD_CHANGE_REQUIRED` for normal application routes until the password changes.

## Authenticated Requester routes

The following routes derive the requester from the authenticated session. No `requesterId` query/body parameter is accepted as an ownership decision.

| Purpose | Method and path | Success |
|---|---|---|
| Create ticket | `POST /api/tickets` | `201` ticket with server ticket number, status `NEW`, and copied `itPriority` |
| My tickets | `GET /api/tickets` | `200 { items, pagination }` |
| Own ticket detail | `GET /api/tickets/:ticketId` | `200` safe ticket detail without Internal Notes |
| Attachments metadata | `GET /api/tickets/:ticketId/attachments` | `200` metadata only |
| Upload attachment | `POST /api/tickets/:ticketId/attachments` | `201` metadata |
| Download attachment | `GET /api/attachments/:attachmentId/download` | `200` file stream |
| Soft-remove attachment | `DELETE /api/attachments/:attachmentId` | `200` removed metadata |
| Public Comments | `GET/POST /api/tickets/:ticketId/comments` | `200` list / `201` created comment |
| Problem Appears Resolved | `POST /api/tickets/:ticketId/resolution-signal` | `200` updated safe ticket |

`POST /api/tickets` accepts the Lab 2 fields `categoryId`, `relatedSystemId`, `summary`, `requestedPriority`, `description`, and optional multipart attachment continuity. `GET /api/tickets` supports documented search, category, related-system, requested-priority, status, sort, direction, page, and page-size parameters. Invalid values return `400`; a missing/non-owned resource returns safe `404`.

Requester routes may read/create Public Comments only on owned tickets. Requesters cannot set `currentStatus` to `RESOLVED` or `CLOSED`, change owner, change IT Priority, or read Internal Notes.

## IT Staff queue and ticket operations

| Purpose | Method and path | Success |
|---|---|---|
| Queue | `GET /api/staff/tickets` | `200 { items, pagination, counts }` |
| Staff detail | `GET /api/staff/tickets/:ticketId` | `200` operational detail with comments, notes, and authorized attachments |
| Claim | `POST /api/staff/tickets/:ticketId/claim` | `200` updated owner; `409` if already claimed |
| Assign/reassign | `PATCH /api/staff/tickets/:ticketId/owner` | `200` updated owner or unassigned |
| IT Priority | `PATCH /api/staff/tickets/:ticketId/priority` | `200` updated priority |
| Status | `PATCH /api/staff/tickets/:ticketId/status` | `200` updated status |
| Public Comments | `GET/POST /api/staff/tickets/:ticketId/comments` | `200` list / `201` created comment |
| Internal Notes | `GET/POST /api/staff/tickets/:ticketId/notes` | `200` list / `201` created note |
| Staff/admin attachment download | `GET /api/staff/attachments/:attachmentId/download` | `200` file stream |

Queue query parameters are `search`, `status`, `ownerUserId`, `requestedPriority`, `itPriority`, `categoryId`, `requesterId`, `sort`, `direction`, `page`, and `pageSize`. Search covers ticket number and summary. Sort and page values are finite documented sets; malformed values return `400` rather than silently defaulting.

The permitted transition matrix is the one in `docs/lab-03/specification.md`. Owner changes require an active IT Staff or Administrator, except explicit unassignment. Every update validates the complete request before performing a conditional mutation.

Public Comments contain `{ "content": "..." }`; Internal Notes use the same shape. Both are trimmed, append-only, length-limited, and return `{ id, content, author, createdAt }`. Internal Note endpoints return `403` to Requesters and never include note content in requester responses.

## Administrator routes

| Purpose | Method and path | Success |
|---|---|---|
| User list | `GET /api/admin/users?search=&role=` | `200 { items }` |
| Create user | `POST /api/admin/users` | `201` safe User; initial password is not returned |
| Edit account | `PATCH /api/admin/users/:userId` | `200` safe User |
| Set initial password | `POST /api/admin/users/:userId/initial-password` | `204` and `mustChangePassword=true` |

Create accepts `{ name, email, role, isActive, initialPassword }`; edit accepts `{ name, email, role, isActive }`. Exactly one valid role is required. Duplicate email returns `409`. Administrators cannot deactivate themselves, remove the final active Administrator, or delete users. Requester link creation/editing and ticket-owner integrity are transactional.

## Status codes and safe errors

- `400`: malformed JSON, invalid IDs/query/body values, password/content validation, or invalid transition input.
- `401`: missing, invalid, expired, or revoked bearer session; login credentials are invalid/inactive.
- `403`: authenticated but role-forbidden, ownership-forbidden, or first-login gate.
- `404`: missing or non-owned protected resource without existence disclosure.
- `409`: duplicate email, claim race, stale state, or conflicting account/attachment operation.
- `410`: removed/unavailable attachment.
- `413/415`: attachment too large/unsupported media.
- `500`: generic safe unexpected failure; no database, filesystem, stack, or credential details.
