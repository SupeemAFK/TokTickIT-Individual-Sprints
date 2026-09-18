# Lab 3 UI Specification
Login and Change Password precede the authenticated shell. Requesters see My Tickets and Create Ticket only. IT Staff see Ticket Queue and Ticket Detail. Administrators see User Management. Desktop queues use tables; tablet/mobile use stacked cards. Status, requested priority, IT priority, and role use consistent badges. Public Comments and Internal Notes are visibly distinct. Every screen provides loading, validation, empty/no-result, forbidden, success, and safe failure feedback.


## Feedback and responsive states

Login, password change, requester create/detail, staff queue/detail, and admin management provide loading, validation, empty/no-result, success, forbidden/error, and retry-safe feedback. Ticket creation keeps the created ticket when an optional attachment fails and displays a warning. Staff queue and administrator records render tables at desktop widths and stacked cards below the medium breakpoint; evidence covers desktop, tablet, and mobile states.
