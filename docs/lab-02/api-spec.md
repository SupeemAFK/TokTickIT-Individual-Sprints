# Lab 2 API Contract

All responses are JSON unless downloading a file. Safe errors use `{ "error": "Human-readable safe message." }`. The temporary `requesterId` is Lab 2 testing context, not authentication.

## Reference and Requester Data

| Purpose | Method and path | Success | Failures |
|---|---|---|---|
| Active categories | `GET /api/categories` | `200 [{id,name}]` | `500` safe error |
| Active related systems | `GET /api/related-systems` | `200 [{id,name}]` | `500` safe error |
| Active requesters | `GET /api/development-requesters` | `200 [{id,name,email}]` ordered by name | `500` safe error |

Inactive data is never returned by these endpoints.

## Create Ticket

`POST /api/tickets`

Request:

```json
{"requesterId":1,"categoryId":1,"relatedSystemId":2,"summary":"VPN cannot connect","requestedPriority":"MEDIUM","description":"VPN connection fails after signing in."}
```

The server trims text, validates all fields, verifies active requester and references, creates status `NEW`, sets the server ticket date, generates the ticket number, and returns `201` with the created ticket. `400` means invalid data; `404` means requester/reference data is unavailable; `500` is safe unexpected failure.

## My Tickets

`GET /api/tickets?requesterId=1&search=vpn&categoryId=1&relatedSystemId=2&requestedPriority=MEDIUM&status=NEW&sort=createdAt&direction=desc&page=1&pageSize=10`

`requesterId` is required. `search` is optional (ticket number or summary). Filter parameters are optional. Sort values are `createdAt`, `updatedAt`, `ticketNumber`, `summary`, and `requestedPriority`; direction is `asc` or `desc`; default is `createdAt desc`, then `id desc`. Page is 1-based; pageSize is 10, 20, or 50.

Success `200`:

```json
{"items":[{"id":12,"ticketNumber":"TKT-2026-000012","summary":"VPN cannot connect","currentStatus":"NEW","requestedPriority":"MEDIUM","category":{"id":1,"name":"Network"},"relatedSystem":{"id":2,"name":"VPN"},"createdAt":"2026-08-23T00:00:00.000Z","updatedAt":"2026-08-23T00:00:00.000Z"}],"pagination":{"page":1,"pageSize":10,"totalItems":1,"totalPages":1}}
```

Invalid or malformed query values return `400`; inactive/missing requester returns `404`; unexpected failure returns `500`.

## Owned Ticket Detail

`GET /api/tickets/:ticketId?requesterId=1`

Returns `200` with the ticket, requester display name, category, and related system. Attachment metadata is returned by its separate attachment endpoint when that feature is implemented. Missing or non-owned tickets return the same safe `404`; invalid IDs return `400`; unexpected failures return `500`.

## Attachments

| Purpose | Method and path | Request / success | Important errors |
|---|---|---|---|
| Upload | `POST /api/tickets/:ticketId/attachments` | multipart `file`, `requesterId`; `201` attachment metadata | `400` invalid request, `404` non-owned/missing ticket, `413` >5 MiB, `415` unsupported type, `409` five active attachments, `500` safe error |
| Metadata | `GET /api/tickets/:ticketId/attachments?requesterId=1` | `200` includes active and removed metadata | `404` non-owned/missing ticket |
| Download | `GET /api/attachments/:attachmentId/download?requesterId=1` | `200` file stream, safe content-disposition | `404` non-owned/missing, `410` removed/unavailable |
| Soft remove | `DELETE /api/attachments/:attachmentId?requesterId=1` | JSON `{ "removalReason": "No longer relevant" }`; `200` removed metadata | `400` invalid reason, `404` non-owned/missing, `409` already removed, `500` safe error |

Attachment metadata includes `id`, `originalFilename`, `mimeType`, `byteSize`, `createdAt`, `removedAt`, `removalReason`, and removal requester display name where applicable. No internal storage paths are returned.
