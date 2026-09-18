# Lab 3 API Contract
Authentication uses an eight-hour bearer session token returned by `POST /api/auth/login`; clients send `Authorization: Bearer <token>`. `POST /api/auth/logout`, `GET /api/auth/me`, and `POST /api/auth/change-password` manage sessions and mandatory password changes.

Requester routes are session-owned: `GET/POST /api/requester/tickets`, `GET /api/requester/tickets/:id`, `POST /api/requester/tickets/:id/comments`, and `POST /api/requester/tickets/:id/appears-resolved`. The legacy `/api/tickets` and `/api/attachments` routes remain available for migrated Lab 2 clients, but validate any legacy requester hint and always derive ownership from the bearer session. Requester detail returns public comments and attachment metadata only; Internal Notes are never exposed.

IT Staff: `GET /api/staff/tickets`, `GET /api/staff/tickets/:id`, `PATCH /api/staff/tickets/:id`, `POST /api/staff/tickets/:id/comments`, and `POST /api/staff/tickets/:id/notes` require IT Staff or Administrator. Administrator user management: `GET`, `POST /api/admin/users` and `PATCH /api/admin/users/:id` require Administrator. APIs return 401 unauthenticated, 403 forbidden, 400 invalid input, 404 missing resources, and 409 conflicts.


## Response shapes and safe errors

Successful collection responses use `{ items, pagination }` for queues and `{ items }` for requester tickets. Successful user responses contain only id, name, email, role, activation state, password-change state, and legacy requester linkage; password hashes and session secrets are never returned. Validation and conflicts return `{ error: string }` with 400/409; unauthenticated, forbidden, missing, and unexpected failures return safe `{ error: string }` bodies with 401/403/404/500.

The staff queue accepts `search`, `status`, `assigned`, `page`, `pageSize`, `sort`, and `direction`; the admin user list accepts `search` and `role`. Staff detail updates accept `claim`, `ownerUserId`, `itPriority`, and `currentStatus`; comments and notes accept `{ content }`.
