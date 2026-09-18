# Lab 3 API Contract
Authentication uses an eight-hour bearer session token returned by `POST /api/auth/login`; clients send `Authorization: Bearer <token>`. `POST /api/auth/logout`, `GET /api/auth/me`, and `POST /api/auth/change-password` manage sessions and mandatory password changes.

IT Staff: `GET /api/staff/tickets`, `GET /api/staff/tickets/:id`, `PATCH /api/staff/tickets/:id`, `POST /api/staff/tickets/:id/comments`, and `POST /api/staff/tickets/:id/notes` require IT Staff or Administrator. Administrator user management: `GET`, `POST /api/admin/users` and `PATCH /api/admin/users/:id` require Administrator. APIs return 401 unauthenticated, 403 forbidden, 400 invalid input, 404 missing resources, and 409 conflicts.
