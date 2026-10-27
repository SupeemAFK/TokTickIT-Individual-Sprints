# Lab 4 API Contract

All protected routes require the Lab 3 bearer session. Errors use the existing safe JSON envelope with a stable code. Role and Ticket ownership checks run on the server.

## Action Taken shape

Responses include: id, ticketId, actionAt (ISO-8601 UTC), description, result, status, followUpRequired, followUpNote, attachmentNotes, assignedToUserId, assignedTo ({id,name,role}|null), performedBy ({id,name,role}), createdAt, updatedAt. The idempotency key is never returned.

Statuses are OPEN, IN_PROGRESS, COMPLETED, and CANCELLED. New actions start OPEN. List ordering is actionAt ascending, then id ascending.

## Action endpoints

| Purpose | Method and path | Access | Request / success |
|---|---|---|---|
| List actions | GET /api/tickets/:ticketId/actions | Staff/Admin; Requester for own Ticket | 200 {items: ActionTaken[]} |
| Create action | POST /api/staff/tickets/:ticketId/actions | Staff/Admin | Idempotency-Key header plus action fields; 201 {action: ActionTaken}; replay returns 200 with the existing action |
| Edit/transition | PATCH /api/staff/tickets/:ticketId/actions/:actionId | Staff/Admin | Requires expectedUpdatedAt and at least one mutable field; 200 {action: ActionTaken} |
| Cancel action | POST /api/staff/tickets/:ticketId/actions/:actionId/cancel | Staff/Admin | Requires expectedUpdatedAt; 200 {action: ActionTaken} |
| Eligible assignees | GET /api/staff/users | Staff/Admin | Existing Lab 3 endpoint; active IT Staff/Admin only |

Create JSON fields: actionAt, description, result, assignedToUserId (nullable), followUpRequired, followUpNote (nullable), attachmentNotes (nullable). The server sets status=OPEN, performedBy, timestamps, and idempotency-key storage with a hash of the normalized create payload. A repeated key for the same actor/Ticket and payload returns the original action; conflicting reuse returns 409 IDEMPOTENCY_KEY_REUSED.

PATCH mutable fields: actionAt, description, result, assignedToUserId (nullable), status, followUpRequired, followUpNote, and attachmentNotes. Ticket ID, performer, idempotency key, createdAt, and updatedAt are server controlled. The UI sends the row’s latest updatedAt as expectedUpdatedAt. Cancel is a state transition, not deletion. Terminal actions cannot be edited or cancelled.

Ticket status remains PATCH /api/staff/tickets/:ticketId/status with {expectedCurrentStatus,currentStatus}. A transition to RESOLVED is checked transactionally with action writes on the same parent Ticket. If any action is OPEN or IN_PROGRESS, return 409 ACTIONS_INCOMPLETE and leave status unchanged. Stale Ticket or Action writes return 409 CONFLICT. The Ticket request includes expectedCurrentStatus; the Action request includes expectedUpdatedAt. A failed idempotency replay returns 409 IDEMPOTENCY_KEY_REUSED.

## Dashboard endpoints

| Purpose | Method and path | Access | Success |
|---|---|---|---|
| Staff dashboard | GET /api/staff/dashboard | IT Staff/Admin | 200 {metrics, myActions, recentTickets} |
| Requester dashboard | GET /api/requester/dashboard | Requester | 200 {metrics, recentlyResolvedTickets, recentTickets} |

Staff metrics: activeTickets; unassignedActiveTickets; myActiveTickets; activeByStatus (all active statuses, including zero counts); activeByItPriority (LOW/MEDIUM/HIGH, including zero counts); waitingForRequester; resolvedLast7Days; and myActiveActions. Counts use the full authorized dataset, not a page. myActions returns at most ten actions assigned to the session user with status OPEN/IN_PROGRESS, ordered actionAt ascending then ID ascending; each contains a safe parent Ticket summary. recentTickets returns at most ten Tickets ordered updatedAt descending then ID descending.

Requester metrics: totalTickets; activeTickets; waitingForRequester; and resolvedLast30Days. All queries use the requester ID linked to the session. recentlyResolvedTickets returns up to ten owned Tickets with resolvedAt in [now-30d, now), ordered resolvedAt descending then ID descending. recentTickets returns up to ten own Tickets by updatedAt descending then ID descending. Empty lists are [] and all metric buckets/counts are zero.

Time windows are rolling UTC instants, inclusive at the lower bound and exclusive at now. Dashboard lists include only safe summary fields. Staff ticket drill-down uses the existing Queue filters plus an additive active status-group filter; Requester drill-down uses the existing My Tickets filters plus the same active group. Action and recent Ticket rows open the authorized Ticket detail.

## Safe errors

- 400 INVALID_REQUEST: malformed IDs, missing offset, invalid text/status, or invalid assignee.
- 401 UNAUTHENTICATED: invalid or expired session.
- 403 FORBIDDEN: wrong role, password change required, or unlinked Requester account.
- 404 NOT_FOUND: missing Ticket/action or Requester access to another person’s Ticket.
- 409 CONFLICT: stale Ticket/Action update or illegal status transition.
- 409 ACTIONS_INCOMPLETE: an active action prevents resolution.
- 409 IDEMPOTENCY_KEY_REUSED: key is already bound to another actor/Ticket or conflicting request.
- 500 SERVER_ERROR: generic safe error; never expose credentials, SQL, filesystem paths, or stack traces.
