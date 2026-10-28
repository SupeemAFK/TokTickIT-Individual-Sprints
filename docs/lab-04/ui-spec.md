# Lab 4 UI Specification — Zen Green

Keep the authenticated Lab 3 shell and Zen Green visual language. Add only the navigation and screens needed for Lab 4. Dashboard cards use concise labels and values; status and priority remain understandable without color.

## Navigation and Ticket workflow

- All roles receive a Dashboard navigation item with visible active-page indication.
- Requesters retain My Tickets as their normal landing page. Staff/Admin retain the Ticket Queue as their normal landing page.
- Staff/Admin see only server-approved Ticket status transitions. Requester “appears resolved” remains advisory.
- On a 409 resolution conflict, refresh the Ticket summary, preserve the current page, and show the safe reason.

## IT Staff / Administrator dashboard

Show active Tickets, unassigned active Tickets, active Tickets owned by the current user, waiting for Requester, resolved in the last seven days, active counts by status/IT Priority, and “My Actions.” The resolved metric has an accessible “View matching Tickets” action that opens the paginated Staff Queue resolved view with the exact server-returned window; the list includes Tickets later moved to CLOSED, excludes legacy Tickets with unknown resolvedAt, and every row opens Ticket Detail. My Actions lists up to ten actions assigned to the signed-in staff member, with status, date, description, parent Ticket, and a link to Ticket Detail. Also show up to ten recently updated Tickets. Useful status/priority/owner summaries link to matching Ticket Queue filters; list rows open Ticket Detail.

## Requester dashboard

Show own total, active, waiting-for-requester, and resolved-in-the-last-30-days counts. The resolved metric has an accessible “View matching Tickets” action that opens a paginated My Tickets resolved view using the exact server-returned window. It excludes legacy Tickets with unknown resolvedAt. Show owned Tickets needing attention (waiting for the Requester), recently updated own Tickets, and recently resolved own Tickets. Ticket links use existing ownership-protected detail. Never duplicate the full My Tickets management screen.

## Actions Taken on Ticket Detail

- Staff/Admin see a stable chronological list and create/edit/status/cancel controls for eligible Tickets.
- The form includes Action Date/Time, Description, Result, optional assignee from active staff, status, Follow-Up Required, conditional required Follow-up Note, and Attachment Notes. Performed By is displayed as read-only session-derived information.
- Changing action assignment does not change Ticket Owner or performer. Terminal actions remain visible and read-only.
- Requesters see all action history for their own Ticket and no staff controls or internal notes.
- Show loading, no-actions, busy, field validation, success, retryable safe failure, forbidden/not-found, and conflict states. Preserve entered values after recoverable failures. Retain an idempotency key across an ambiguous create failure; disable the submit control while saving.

## Accessibility and responsive rules

- Every control has a visible label, useful instructions, and adjacent validation.
- Keyboard focus is visible; forms, status text, and error/success announcements are semantic and screen-reader accessible.
- Status and priority use text as well as color. Read-only fields are not presented as editable.
- Cards stack on small screens; lists reflow without horizontal page scrolling. Verify 375, 768, and 1440 px.
- Visual review checks clipping, overlap, duplicate/obsolete controls, broken links, console errors, and consistency with Lab 2/3 patterns.
