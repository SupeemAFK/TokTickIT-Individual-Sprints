# Lab 3 UI Specification — Zen Green

## Shared shell and visual rules

Lab 3 reuses the Lab 2 Zen Green tokens: primary `#006B3C`, secondary `#0B7A46`, pale green `#EAF6EF`, quiet background `#F5F7F6`, white surfaces, subtle borders, dark charcoal-green text, visible keyboard focus, and text-plus-colour badges. Labels remain above controls; editable fields use white surfaces and read-only values use pale green/gray surfaces.

The authenticated shell shows TokTickIT, the current user's name and role, permitted navigation, and Logout. Navigation is role-specific but does not replace backend authorization. All screens provide meaningful loading, success, validation, empty/no-results, forbidden, not-found, conflict, retryable failure, and safe API-failure feedback where applicable.

## Screen modes

### Login

Fields: email and password. Modes: loading, validation error, safe failure, success, and inactive-account response. Inputs are labelled, keyboard accessible, and busy controls are disabled while submitting.

### Mandatory Change Password

Fields: new password and confirmation. The screen visibly lists the 12+ character mixed-case/numeric rules, validates confirmation, prevents duplicate submission, and continues to the authenticated shell only after success. First-login users cannot bypass it by navigating directly.

### Requester My Tickets and Create Ticket

The Lab 2 selector and Change Requester action are removed. The shell identifies the authenticated Requester. Existing search, category/system/status/priority filters, sorting, pagination, ticket creation, validation, and attachment flow remain available. Requester Ticket Detail adds Public Comments and Problem Appears Resolved while omitting Internal Notes and staff controls.

### IT Staff Ticket Queue

Desktop uses a readable table with Ticket Number, Created/Updated date, Summary, Requester, Category, Requested Priority, IT Priority, Status, Owner, and an Open action. Tablet/mobile uses stacked cards containing the same decision-making information without horizontal scrolling. Search, filters, sort, page size, pagination, clear controls, loading, empty, no-results, forbidden, and retryable failure states are visible.

### IT Staff Ticket Detail

Sections are visually separated into ticket information, ownership/priority/status controls, attachments, Public Comments, and Internal Notes. Only permitted operational fields are editable. Claim/reassign, transition confirmation where needed, comment/note validation, safe failures, and conflict feedback are explicit. Public Comments and Internal Notes cannot be confused visually.

### Administrator User Management

One responsive screen provides a user list with Name, Email, Role, Status, and Edit. Search covers name/email; role filter is optional and single-select. Create/Edit forms support one role, activation, and initial password actions. Duplicate email, invalid input, forbidden access, self-deactivation, final-admin protection, success, and safe failure states are visible. Mobile cards retain Edit and account actions.

## Accessibility and responsive rules

- Every input has a programmatic label; password controls are discoverable by accessible name.
- Status, priority, role, and ownership use text in addition to colour.
- Focus is visible; buttons have text or an accessible label; busy states are announced with `role="status"` or `aria-live` where appropriate.
- No screen clips content, overlaps validation, or relies on horizontal page scrolling.

| Viewport | Rule |
|---|---|
| Desktop ≥992px | Centered max-width content; table/list layouts; grouped form columns where readable. |
| Tablet 768–991px | Condensed navigation; queue/admin cards or scroll-free compact layout; two-column forms only where safe. |
| Mobile <768px | One-column forms, stacked queue/admin cards, touch-friendly controls, no horizontal overflow. |

## Visual inspection checklist

Capture Login, Change Password, Requester, Staff Queue, Staff Detail, and User Management at desktop, tablet, and mobile widths. Check tokens, role navigation, labels, focus, badges, editable/read-only distinction, validation placement, busy/disabled controls, loading/retry/empty/no-results/forbidden states, attachment actions, clipping, overlap, and horizontal overflow. Store evidence under `artifacts/lab-03/screenshots/{authentication,requester,staff-queue,staff-ticket-detail,user-management}/`.
