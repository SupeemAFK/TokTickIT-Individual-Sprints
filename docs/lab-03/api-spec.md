# Lab 3 API Contract

All JSON responses use the shapes below. Protected routes require `Authorization: Bearer <session-token>`. Session tokens are opaque, random credentials; the API never returns token hashes, password hashes, salts, or initial passwords.

## Common response shapes and errors

The safe User shape is:

```json
{
  "id": 8,
  "name": "Ada Requester",
  "email": "ada@example.test",
  "role": "REQUESTER",
  "isActive": true
}
```

Authentication responses always wrap that shape as `{ "user": SafeUser, "mustChangePassword": true|false }`; `mustChangePassword` is never nested inside `user`.

Every API error has this exact shape; `code` is stable and contains no account, database, filesystem, or credential detail:

```json
{"error":"Human-readable safe message.","code":"INVALID_REQUEST"}
```

Error codes are `INVALID_REQUEST`, `LOGIN_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `PASSWORD_CHANGE_REQUIRED`, `NOT_FOUND`, `CONFLICT`, `OWNER_INTEGRITY_CONFLICT`, `GONE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, and `SERVER_ERROR`.

- `400 INVALID_REQUEST`: malformed JSON, invalid IDs/query/body values, password/content validation, or an unknown transition value.
- `401 UNAUTHENTICATED` or `LOGIN_FAILED`: missing/invalid/expired/revoked session or invalid/inactive login credentials.
- `403 FORBIDDEN` or `PASSWORD_CHANGE_REQUIRED`: authenticated but role-forbidden, ownership-forbidden, or normal access blocked by first-login gate.
- `404 NOT_FOUND`: missing or non-owned protected resource without existence disclosure.
- `409 CONFLICT`: duplicate email, claim race, owner-integrity conflict, stale state, or a valid status transition that is not allowed from the current status.
- `410 GONE`: removed/unavailable attachment.
- `413 PAYLOAD_TOO_LARGE` / `415 UNSUPPORTED_MEDIA_TYPE`: attachment size/type violations.
- `500 SERVER_ERROR`: generic unexpected failure.

## Existing Lab 2 reference endpoints

These remain public read-only reference endpoints and return active records only:

| Purpose | Method and path | Success |
|---|---|---|
| Health | `GET /api/health` | `200 { "status":"ok", "service":"TokTickIT API" }` |
| Active categories | `GET /api/categories` | `200 [{ "id":1, "name":"Network" }]` |
| Active related systems | `GET /api/related-systems` | `200 [{ "id":2, "name":"VPN" }]` |

`GET /api/development-requesters` is removed from the user-facing Lab 3 flow because the selector is removed. Existing rows remain for migration/backfill and ticket ownership; no browser-supplied requester context is accepted by protected routes.

## Authentication

| Purpose | Method and path | Success |
|---|---|---|
| Login | `POST /api/auth/login` | `200 { user, session: { token, expiresAt } }` |
| Current user | `GET /api/auth/me` | `200 { "user": SafeUser, "mustChangePassword": true|false }` |
| Change initial password | `POST /api/auth/change-password` | `200 { "user": SafeUser, "mustChangePassword": false }` |
| Logout | `POST /api/auth/logout` | `204` |

Login accepts:

```json
{"email":"requester@example.test","password":"Lab3Pass123"}
```

A successful login returns:

```json
{
  "user": {"id":8,"name":"Ada Requester","email":"ada@example.test","role":"REQUESTER","isActive":true},
  "mustChangePassword": true,
  "session": {"token":"opaque-bearer-value","expiresAt":"2026-09-19T12:00:00.000Z"}
}
```

A first-login session may call `/me` and `/change-password`; normal application routes return `403` with code `PASSWORD_CHANGE_REQUIRED` until the password changes. Change Password accepts `{ "newPassword":"NewValidPass123", "confirmation":"NewValidPass123" }` and requires the documented 12+ character mixed-case/numeric rule.

## Authenticated Requester routes

These routes derive the requester from the authenticated session. No `requesterId` query/body parameter is accepted as an ownership decision.

### Ticket shapes

A ticket summary is:

```json
{
  "id":12,
  "ticketNumber":"TKT-2026-000012",
  "summary":"VPN cannot connect",
  "requestedPriority":"MEDIUM",
  "itPriority":"MEDIUM",
  "currentStatus":"NEW",
  "owner":null,
  "category":{"id":1,"name":"Network"},
  "relatedSystem":{"id":2,"name":"VPN"},
  "createdAt":"2026-09-19T08:00:00.000Z",
  "updatedAt":"2026-09-19T08:00:00.000Z"
}
```

A Requester ticket detail has this exact shape:

```json
{
  "ticket": {
    "id":12,
    "ticketNumber":"TKT-2026-000012",
    "summary":"VPN cannot connect",
    "description":"VPN connection fails after signing in.",
    "requestedPriority":"MEDIUM",
    "itPriority":"MEDIUM",
    "currentStatus":"NEW",
    "owner":null,
    "requester":{"id":8,"name":"Ada Requester","email":"ada@example.test"},
    "category":{"id":1,"name":"Network"},
    "relatedSystem":{"id":2,"name":"VPN"},
    "attachments":[],
    "publicComments":[],
    "problemAppearsResolvedAt":null,
    "createdAt":"2026-09-19T08:00:00.000Z",
    "updatedAt":"2026-09-19T08:00:00.000Z"
  }
}
```

It never includes `internalNotes` for a Requester. A staff detail uses the same ticket fields and additionally returns `internalNotes`.

| Purpose | Method and path | Success |
|---|---|---|
| Create ticket | `POST /api/tickets` | `201` ticket detail with server ticket number, status `NEW`, and copied `itPriority` |
| My tickets | `GET /api/tickets` | `200 { "items":[TicketSummary], "pagination":{...} }` |
| Own ticket detail | `GET /api/tickets/:ticketId` | `200` ticket detail |
| Attachments metadata | `GET /api/tickets/:ticketId/attachments` | `200 { "items":[Attachment] }` |
| Upload attachment | `POST /api/tickets/:ticketId/attachments` | `201 { "attachment": Attachment }` |
| Download attachment | `GET /api/attachments/:attachmentId/download` | `200` file stream |
| Soft-remove attachment | `DELETE /api/attachments/:attachmentId` | `200` removed Attachment |
| Public Comments | `GET/POST /api/tickets/:ticketId/comments` | `200 { "items":[Comment] }` / `201` Comment |
| Problem Appears Resolved | `POST /api/tickets/:ticketId/resolution-signal` | `200` updated ticket detail |

`POST /api/tickets` accepts JSON `{ categoryId, relatedSystemId, summary, requestedPriority, description }`. The UI may immediately call the separate multipart attachment endpoint after ticket creation; if that upload fails, the ticket remains saved and the UI shows a warning rather than claiming the attachment succeeded. `GET /api/tickets` supports `search`, `categoryId`, `relatedSystemId`, `requestedPriority`, `status`, `sort`, `direction`, `page`, and `pageSize`; defaults are `sort=createdAt`, `direction=desc`, `page=1`, and `pageSize=10`. Allowed page sizes are 10, 20, and 50.

Requester Public Comments use `{ "content":"The issue still occurs." }` and return:

```json
{"id":31,"content":"The issue still occurs.","author":{"id":8,"name":"Ada Requester","role":"REQUESTER"},"createdAt":"2026-09-19T08:05:00.000Z"}
```

Attachments return metadata only:

```json
{"id":4,"originalFilename":"screenshot.png","mimeType":"image/png","byteSize":2048,"createdAt":"2026-09-19T08:03:00.000Z","removedAt":null,"removalReason":null}
```

`POST /api/tickets/:ticketId/attachments` uses `multipart/form-data` with one `file` field and no requester ID. Allowed types are `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`; the maximum is 5 MiB and five active attachments per ticket. Success is `201 { "attachment": Attachment }`. Missing file, malformed ticket ID, or invalid metadata is `400 INVALID_REQUEST`; non-owned/missing tickets are safe `404 NOT_FOUND`; unsupported media is `415 UNSUPPORTED_MEDIA_TYPE`; oversized files are `413 PAYLOAD_TOO_LARGE`; the active-file limit is `409 CONFLICT`; storage/database failure is generic `500 SERVER_ERROR`. A failed upload never invalidates an already-created ticket.

## IT Staff queue and ticket operations

| Purpose | Method and path | Success |
|---|---|---|
| Queue | `GET /api/staff/tickets` | `200 { "items":[QueueItem], "pagination":{...}, "counts":{...} }` |
| Staff detail | `GET /api/staff/tickets/:ticketId` | `200 { "ticket": StaffTicketDetail }` with comments, notes, and authorized attachments |
| Claim | `POST /api/staff/tickets/:ticketId/claim` | `200` updated owner; `409` if already claimed |
| Assign/reassign | `PATCH /api/staff/tickets/:ticketId/owner` | `200` updated owner or unassigned |
| IT Priority | `PATCH /api/staff/tickets/:ticketId/priority` | `200` updated ticket |
| Status | `PATCH /api/staff/tickets/:ticketId/status` | `200` updated ticket |
| Public Comments | `GET/POST /api/staff/tickets/:ticketId/comments` | `200 { "items":[Comment] }` / `201` Comment |
| Internal Notes | `GET/POST /api/staff/tickets/:ticketId/notes` | `200 { "items":[Note] }` / `201` Note |
| Staff/admin attachment download | `GET /api/staff/attachments/:attachmentId/download` | `200` file stream |

`QueueItem` is the TicketSummary shape plus `requester:{id,name}`, and `owner:{id,name,role}|null`. It uses the single `updatedAt` field from TicketSummary; `updatedAt` is the server timestamp of the latest Ticket row/workflow mutation, while comments and notes retain their own `createdAt`. Queue query parameters are `search`, `status`, `ownerUserId`, `requestedPriority`, `itPriority`, `categoryId`, `requesterId`, `sort`, `direction`, `page`, and `pageSize`.

`counts` describes the current filtered result set before pagination:

```json
{"totalItems":42,"unassigned":7,"byStatus":{"NEW":10,"OPEN":8,"IN_PROGRESS":12,"WAITING_FOR_REQUESTER":4,"RESOLVED":3,"CLOSED":2,"REOPENED":2,"CANCELLED":1},"byItPriority":{"LOW":8,"MEDIUM":21,"HIGH":13}}
```

The exact status keys present may have zero values, but all required statuses are represented. `totalItems` is the filtered total; `unassigned`, `byStatus`, and `byItPriority` count that same filtered set. Pagination is `{ "page":1, "pageSize":10, "totalItems":42, "totalPages":5 }`.

A StaffTicketDetail response has this exact shape:

```json
{
  "ticket": {
    "id":12,
    "ticketNumber":"TKT-2026-000012",
    "summary":"VPN cannot connect",
    "description":"VPN connection fails after signing in.",
    "requestedPriority":"MEDIUM",
    "itPriority":"HIGH",
    "currentStatus":"IN_PROGRESS",
    "owner":{"id":4,"name":"IT Staff One","role":"IT_STAFF"},
    "requester":{"id":8,"name":"Ada Requester","email":"ada@example.test"},
    "category":{"id":1,"name":"Network"},
    "relatedSystem":{"id":2,"name":"VPN"},
    "attachments":[{"id":4,"originalFilename":"screenshot.png","mimeType":"image/png","byteSize":2048,"createdAt":"2026-09-19T08:03:00.000Z","removedAt":null,"removalReason":null}],
    "publicComments":[{"id":31,"content":"The issue still occurs.","author":{"id":4,"name":"IT Staff One","role":"IT_STAFF"},"createdAt":"2026-09-19T08:05:00.000Z"}],
    "internalNotes":[{"id":9,"content":"Checked VPN gateway logs.","author":{"id":4,"name":"IT Staff One","role":"IT_STAFF"},"createdAt":"2026-09-19T08:06:00.000Z"}],
    "problemAppearsResolvedAt":null,
    "createdAt":"2026-09-19T08:00:00.000Z",
    "updatedAt":"2026-09-19T08:07:00.000Z"
  }
}
```

Comments and notes are append-only and use `{ "content":"..." }`. Both return `{ id, content, author:{id,name,role}, createdAt }`; Internal Notes are never returned to Requesters. Owner deactivation/demotion with any owned ticket, including `CLOSED`, returns `409 OWNER_INTEGRITY_CONFLICT` and makes no change.

The permitted transition matrix is the one in `docs/lab-03/specification.md`. An unknown/malformed target status is `400 INVALID_REQUEST`; a valid target that is not allowed from the current state is `409 CONFLICT`. Every update validates the complete request before performing a conditional mutation.

## Administrator routes

| Purpose | Method and path | Success |
|---|---|---|
| User list | `GET /api/admin/users?search=&role=` | `200 { "items":[SafeUser] }` |
| Create user | `POST /api/admin/users` | `201` SafeUser; initial password is not returned |
| Edit account | `PATCH /api/admin/users/:userId` | `200` SafeUser |
| Set initial password | `POST /api/admin/users/:userId/initial-password` | `204`; `mustChangePassword=true` |

Create accepts `{ name, email, role, isActive, initialPassword }`; edit accepts `{ name, email, role, isActive }`. Exactly one valid role is required. Duplicate email returns `409 CONFLICT`. Administrators cannot deactivate themselves, remove the final active Administrator, or delete users. A role/activation update that would leave a ticket owned by an inactive/non-staff account returns `409 OWNER_INTEGRITY_CONFLICT`, including for `CLOSED` tickets. User and linked Requester writes are transactional.
