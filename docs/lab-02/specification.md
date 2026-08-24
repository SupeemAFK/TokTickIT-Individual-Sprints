# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a responsive Requester-facing TokTickIT MVP. A selected Development Requester can create and own tickets, find only their own tickets, view a ticket read-only, and manage permitted attachments. The selector is a Lab 2 test context only; it is not authentication.

## 2. Stakeholder Request Interpretation

The IT department needs a safe, usable Requester experience before real authentication and IT-staff workflow are introduced in later labs. The system must persist tickets and attachments in PostgreSQL, generate the official ticket number on the server, enforce requester ownership in the backend, and provide consistent Zen Green responsive UI states.

## 3. Scope

### Included

- Development Requester selection and switching using active seeded requesters.
- Create Ticket, My Tickets, owned Ticket Detail, and attachment upload/download/soft removal.
- Search, filtering, sorting, pagination, validation, loading, empty, no-results, success, and safe-failure states.
- PostgreSQL/Prisma migration and idempotent seed data.
- Zen Green reusable UI rules, accessibility checks, automated tests, E2E evidence, documentation, PR review, and release integration.

### Excluded

- Authentication, login/logout, passwords, sessions, JWTs, secure identity, and role-based authorization.
- IT Staff queues, assignment, IT priority, comments, notes, actions taken, status changes, resolution, closure, reopening, cancellation, and administration.

## 4. Functional Requirements

- **FR-01** Load and display active Development Requesters; require one before requester screens can be used.
- **FR-02** Display the selected requester and provide Change Requester, which reloads requester-specific data.
- **FR-03** Load active categories and related systems from the database.
- **FR-04** Create one validated Ticket for the selected requester and return its backend-generated official ticket number.
- **FR-05** Show only the selected requester's tickets, with search, filters, sorting, pagination, and useful list states.
- **FR-06** Retrieve and display a ticket only when it belongs to the selected requester.
- **FR-07** Upload permitted attachments to an owned ticket and display their metadata.
- **FR-08** Permit download only for an active attachment on an owned ticket.
- **FR-09** Soft-remove an owned active attachment with a reason while retaining its metadata.
- **FR-10** Provide accessible Zen Green responsive UI at desktop, tablet, and mobile widths.

## 5. Business Rules

- **BR-01** The backend generates an immutable, unique official Ticket Number in `TKT-YYYY-######` format; clients cannot supply it.
- **BR-02** A new Ticket has Current Status `NEW` and its Ticket Date is the server creation timestamp.
- **BR-03** Development Requester selection is a testing mechanism only, not authentication or authorization.
- **BR-04** Only active requesters are returned by the selector API. An inactive or missing requester ID is rejected for ticket operations.
- **BR-05** The selected requester ID is kept in client session storage for the current browser tab and is sent explicitly with each Lab 2 request until Lab 3 replaces it with authenticated identity.
- **BR-06** The backend verifies ticket and attachment ownership against that requester ID; the UI alone is never relied on for protection.
- **BR-07** Category, Related System, Summary, Requested Priority, and Description are required. Category and Related System must be active valid IDs; priority is `LOW`, `MEDIUM`, or `HIGH`.
- **BR-08** Summary and Description are trimmed before validation and storage. Summary is 5–160 characters and Description is 10–4,000 characters after trimming; these limits keep lists readable while allowing useful problem reports.
- **BR-09** Frontend validation provides field-level feedback before submission; backend validation repeats every rule and returns a safe validation error. Values remain in the form after validation or server failures.
- **BR-10** A create request cannot be submitted twice while one is pending; the submit button is disabled and labelled busy.
- **BR-11** Search matches ticket number and summary case-insensitively. Filters are category, related system, requested priority, and current status.
- **BR-12** The list defaults to `createdAt` descending with `id` descending as a stable secondary order. Page numbers start at 1; allowed page sizes are 10, 20, and 50. Invalid query values return HTTP 400.
- **BR-13** An empty state means the requester has no tickets; a no-results state means tickets exist but the current query matches none.
- **BR-14** A non-owned or missing ticket is exposed as HTTP 404 with a safe body so requester ownership is not disclosed.
- **BR-15** Allowed attachment media are JPG/JPEG, PNG, WEBP, and PDF. Each active file is at most 5 MiB and a ticket can have at most five active attachments.
- **BR-16** Storage uses a server-generated non-user filename; original filename, MIME type, byte size, and timestamps are retained as metadata. Original names are displayed as text, never executed as paths.
- **BR-17** Attachment upload validates before storage. If file storage or metadata persistence fails, the server removes any newly stored file and returns a safe error; a successfully created ticket remains valid if a later upload fails.
- **BR-18** Removal requires the owner, an active attachment, confirmation, and a trimmed 5–500 character reason. It records `removedAt`, `removedByRequesterId`, and `removalReason`; it does not delete the row.
- **BR-19** Removed attachment metadata remains visible with a Removed indicator, but preview and download return HTTP 410 and no file bytes.
- **BR-20** Unexpected errors return safe messages without stack traces or database details; failed list/reference loads show a retryable UI failure state.

## 6. UI Specification Summary

The shell shows TokTickIT, active page navigation, current requester, and Change Requester. The Create form separates read-only system values from editable fields, uses field-level errors and a busy submit state. My Tickets is a desktop table and mobile cards. Ticket Detail is read-only and visually separates ticket data from attachment actions. Details are in [ui-spec.md](ui-spec.md).

## 7. Data Changes

The Issue 3 implementation will add the following PostgreSQL/Prisma design. These are the approved proposed model names and fields; the implementation must keep the schema, migration, API, and tests consistent with them.

| Model | Fields, types, and constraints |
|---|---|
| `DevelopmentRequester` | `id Int @id @default(autoincrement())`; `name String`; `email String @unique`; `isActive Boolean @default(true)`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`; `tickets Ticket[]`; `removedAttachments Attachment[]` (named relation). Index: `[isActive, name]` for the active selector. |
| `Category` | Existing `id Int @id @default(autoincrement())`, `name String @unique`, and `createdAt DateTime @default(now())`; add `isActive Boolean @default(true)`, `updatedAt DateTime @updatedAt`, and `tickets Ticket[]`. Index: `[isActive, name]` for active reference-data lookup. |
| `RelatedSystem` | `id Int @id @default(autoincrement())`; `name String @unique`; `isActive Boolean @default(true)`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`; `tickets Ticket[]`. Index: `[isActive, name]`. |
| `Ticket` | `id Int @id @default(autoincrement())`; `ticketNumber String @unique`; `requesterId Int`; `categoryId Int`; `relatedSystemId Int`; `summary String`; `requestedPriority RequestedPriority`; `description String @db.Text`; `currentStatus TicketStatus @default(NEW)`; `createdAt DateTime @default(now())`; `updatedAt DateTime @updatedAt`; `attachments Attachment[]`. `createdAt` is the server-generated Ticket Date, avoiding a duplicate date field. Required foreign-key relations point to `DevelopmentRequester`, `Category`, and `RelatedSystem`. Indexes: `[requesterId, createdAt]`, `[requesterId, categoryId]`, `[requesterId, relatedSystemId]`, `[requesterId, requestedPriority]`, and `[requesterId, currentStatus]`. |
| `Attachment` | `id Int @id @default(autoincrement())`; `ticketId Int`; `originalFilename String`; `storageKey String @unique`; `mimeType String`; `byteSize Int`; `createdAt DateTime @default(now())`; nullable `removedAt DateTime?`, `removalReason String?`, and `removedByRequesterId Int?`. Required relation to `Ticket`; optional named relation to the requester who removed it. Index `[ticketId, removedAt]` supports the active-attachment count and display. Application validation requires removal timestamp, reason, and remover to be set together. |

`RequestedPriority` is the Prisma enum `LOW`, `MEDIUM`, `HIGH`; `TicketStatus` currently contains only `NEW`. Future status transitions are intentionally not added in Lab 2.

All IDs are integer primary keys. The non-null Ticket foreign keys enforce that every Ticket has exactly one requester, category, and related system; the non-null Attachment `ticketId` enforces that every Attachment belongs to exactly one Ticket. One requester/category/related system can relate to many tickets, and one ticket can relate to many attachments. `onDelete: Restrict` will be used for Ticket reference relations and `onDelete: Cascade` for Ticket-to-Attachment rows, preventing accidental deletion of referenced lookup data while keeping attachment records tied to their ticket.

The migration will be a new additive Prisma migration named for Lab 2 ticketing, not an edit to the existing Lab 1 migration. It will add the models, enums, foreign keys, unique constraints, indexes, and the new Category columns with safe defaults so the existing four categories remain valid. The idempotent seed will upsert the required categories, at least six Related Systems, and at least four active plus one inactive Development Requester.

The key design decision is to keep `DevelopmentRequester` separate from a future authentication model and retain its foreign key on Ticket. This makes ownership explicit and testable in Lab 2, while Lab 3 can map or migrate the identity relationship without rewriting ticket, attachment, or audit data.

## 8. API Contract

The API exposes active reference data, requester selection data, ticket creation/list/detail, and attachment lifecycle endpoints. Requester context is explicit in the contract, all mutating requests validate server-side, and owned-resource misses return 404. Full request and response shapes are in [api-spec.md](api-spec.md).

## 9. Acceptance Criteria

- **AC-01** Given active requesters are available, when the selector loads, then it shows only active requesters and explains that it is not login.
- **AC-02** Given no requester is selected, when a requester route is opened, then the selector is shown instead.
- **AC-03** Given a selected requester, when Change Requester is used and another requester is continued, then requester-specific screens reload for the new requester.
- **AC-04** Given valid ticket data, when the requester submits, then exactly one ticket is saved with status New and a backend-generated ticket number is displayed.
- **AC-05** Given invalid ticket input, when submit is attempted, then field errors appear, no invalid ticket is saved, and entered values remain available.
- **AC-06** Given a requester has tickets, when My Tickets loads, then only that requester's tickets appear with usable search, filters, sort, and pagination.
- **AC-07** Given no tickets or no matching tickets, when My Tickets loads, then the appropriate empty or no-results state is shown.
- **AC-08** Given Requester B is selected, when Requester A's ticket is requested directly, then no ticket data is returned.
- **AC-09** Given an owned ticket, when Ticket Detail opens, then its ticket data is read-only and attachment controls are separate.
- **AC-10** Given a valid allowed file and fewer than five active files, when it is uploaded to an owned ticket, then its metadata is displayed and it can be downloaded.
- **AC-11** Given an invalid type, oversized file, sixth active file, or non-owned ticket, when upload is attempted, then the upload is rejected safely and no invalid attachment is active.
- **AC-12** Given an owned active attachment and a valid removal reason, when removal is confirmed, then it is marked removed, metadata remains, and later download or preview is blocked.
- **AC-13** Given desktop, tablet, and mobile viewports, when required screens are inspected, then controls remain accessible with no clipping, overlap, or horizontal page scrolling.
- **AC-14** Given a reference-data or server failure, when the affected screen is used, then a safe error and recovery option are shown without losing appropriate form values.

## 10. Definition of Done

- All approved FR, BR, and AC are implemented and traceable to passing tests.
- Database migration, idempotent seed, API, UI, validation, ownership, attachment lifecycle, and responsive behavior match this contract.
- Required unit, API, UI, UI-style, responsive, and E2E tests pass with none skipped or disabled.
- Visual checklist and desktop/tablet/mobile screenshots are recorded.
- README, test plan, reviewer record, and AI-use record are current.
- Each Issue has a feature branch, reviewed PR into `lab2-staging`, and genuine review evidence; final integration is a reviewed `lab2-staging` to `main` PR.

## 11. Assumptions and Decisions

- Ticket number format, input limits, session-storage context, filters, sort fields, and page sizes are project decisions because the handout leaves them open.
- Attachment binary files will be stored in a gitignored server-local upload directory for this lab; database records retain metadata and soft-removal history.
- `requesterId` is an explicit temporary API parameter only for Lab 2. Lab 3 must derive identity from authentication rather than trusting it.
