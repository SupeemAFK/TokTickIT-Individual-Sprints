# Lab 2 UI Specification — Zen Green

## Foundation and Navigation

Use primary `#006B3C`, secondary `#0B7A46`, pale green `#EAF6EF`, and quiet page background `#F5F7F6`. Surfaces are white with subtle borders/shadows; text is dark charcoal-green. The application shell shows TokTickIT, My Tickets, Create Ticket, selected requester name, and Change Requester. Active navigation has a non-colour indicator as well as green styling.

## Screens and States

- **Requester Selection:** title, testing-only explanation, active requester select, Continue, loading, no-active-requester, retryable failure, and keyboard access.
- **Create Ticket:** read-only Requester, Ticket Date placeholder, and Ticket Number “generated on submission”; editable required Category, Related System, Summary, Requested Priority, and Description; attachment picker; Cancel/primary Submit. Required labels have a red asterisk. Errors are immediately below the field. A successful result states the official ticket number and offers My Tickets/detail navigation.
- **My Tickets:** Create Ticket action, search, filters, sort, clear filters, pagination, loading/error/empty/no-results states. Desktop uses a table with number, summary, category, priority, status, and updated date; each row opens detail. Mobile uses equivalent tappable cards.
- **Ticket Detail:** read-only ticket information section, Back to My Tickets, and separate Attachment section. Attachment states are selected/uploading/active/invalid/removed/unavailable. Removed metadata remains with a text status and disabled unavailable actions.

## Components and Accessibility

Labels are above controls; standard inputs share height; description is a comfortably tall textarea. Editable controls are white with neutral borders; read-only values have pale gray-green/ivory fill; invalid controls have a dark-red border and nearby message. Primary buttons are green, secondary buttons outlined, destructive removal is dark red, disabled and busy buttons are visibly inactive. Focus is clearly visible. Buttons use text; icon-only actions require `aria-label` and tooltip. Status and priority badges use text plus colour.

## Responsive Rules

| Viewport | Layout |
|---|---|
| Desktop ≥992px | Centered max-width content; multi-column form; ticket table. |
| Tablet 768–991px | Two columns where useful; summary/description retain adequate width. |
| Mobile <768px | One-column fields, touch-friendly buttons, card list; no horizontal page scroll. |

## Visual Inspection Checklist

- Check desktop, tablet, and mobile screenshots for Create Ticket, My Tickets, and Ticket Detail.
- Check colors, active navigation, read-only/editable distinction, validation placement, busy/disabled states, badges, attachment states, visible focus, readable filenames, no clipping/overlap, and no horizontal overflow.
- Store screenshots under `artifacts/lab-02/screenshots/create-ticket/`, `my-tickets/`, and `ticket-detail/`.
