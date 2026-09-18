# Lab 3 Engineering Specification
## Sprint goal
Replace the temporary requester selector with secure local-lab authentication and deliver role-limited Requester, IT Staff, and Administrator workflows.
## Functional requirements
FR-01 Active users authenticate by email and password. FR-02 Initial passwords require change before normal access. FR-03 Requesters operate only on their own tickets. FR-04 IT Staff use a searchable, paginated queue and may claim, assign, prioritize, transition, comment, and add notes. FR-05 Administrators manage one-role accounts.
## Business rules
BR-01 Inactive and invalid accounts cannot authenticate. BR-02 Passwords are salted hashes only. BR-03 Server session identity determines ownership. BR-04 Public comments are shared; internal notes are staff-only. BR-05 Requesters cannot formally resolve or close. BR-06 A ticket has at most one active staff owner. BR-07 Only documented transitions are permitted. BR-08 Duplicate emails are rejected. BR-09 Administrators cannot deactivate themselves or remove the final active Administrator.
## Definition of done
Migration preserves Lab 2 data; all protected APIs authorize server-side; UI is responsive and Zen Green consistent; tests, builds, evidence, documentation, peer review, and final-main integration pass.
