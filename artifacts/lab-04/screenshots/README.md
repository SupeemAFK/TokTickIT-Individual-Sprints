# Lab 4 Screenshot and Evidence Index

Captured on 2026-10-30 on PR #81 using local Playwright fixtures with synthetic data, except the repository captures, which show GitHub's rendered pages. Responsive browser flows assert no horizontal page overflow. Captures disable animations and move the pointer away before taking screenshots; the keyboard-focus example intentionally keeps focus visible.

For the report's complete Parts 1–9 mapping, see [`evidence-matrix.md`](../../../docs/lab-04/evidence-matrix.md). The review scope and limits are in [`visual-review.md`](../../../docs/lab-04/visual-review.md).

## Major screens — desktop, tablet, and mobile

| Screen | 1440 px desktop | 768 px tablet | 375 px mobile |
|---|---|---|---|
| Requester Dashboard | [requester-dashboard-1440.png](requester-dashboard/requester-dashboard-1440.png) | [requester-dashboard-768.png](requester-dashboard/requester-dashboard-768.png) | [requester-dashboard-375.png](requester-dashboard/requester-dashboard-375.png) |
| Staff Dashboard | [staff-dashboard-1440.png](staff-dashboard/staff-dashboard-1440.png) | [staff-dashboard-768.png](staff-dashboard/staff-dashboard-768.png) | [staff-dashboard-375.png](staff-dashboard/staff-dashboard-375.png) |
| Staff Ticket Detail with Actions Taken | [actions-taken-1440.png](actions-taken/actions-taken-1440.png) | [actions-taken-768.png](actions-taken/actions-taken-768.png) | [actions-taken-375.png](actions-taken/actions-taken-375.png) |
| Requester Ticket Detail with read-only Action Taken history | [requester-action-history-read-only-1440.png](actions-taken/cases/requester-action-history-read-only-1440.png) | [requester-action-history-read-only-768.png](actions-taken/cases/requester-action-history-read-only-768.png) | [requester-action-history-read-only-375.png](actions-taken/cases/requester-action-history-read-only-375.png) |
| Staff Action Taken create form with conditional follow-up fields | [staff-action-create-form-1440.png](actions-taken/cases/staff-action-create-form-1440.png) | [staff-action-create-form-768.png](actions-taken/cases/staff-action-create-form-768.png) | [staff-action-create-form-375.png](actions-taken/cases/staff-action-create-form-375.png) |
| Ticket resolution blocked by active action | [resolution-blocked-by-active-action-1440.png](ticket-resolution/resolution-blocked-by-active-action-1440.png) | [resolution-blocked-by-active-action-768.png](ticket-resolution/resolution-blocked-by-active-action-768.png) | [resolution-blocked-by-active-action-375.png](ticket-resolution/resolution-blocked-by-active-action-375.png) |
| Ticket resolves after action cancellation | [resolution-after-action-cancelled-1440.png](ticket-resolution/resolution-after-action-cancelled-1440.png) | [resolution-after-action-cancelled-768.png](ticket-resolution/resolution-after-action-cancelled-768.png) | [resolution-after-action-cancelled-375.png](ticket-resolution/resolution-after-action-cancelled-375.png) |

## Action Taken and Dashboard workflow states

These state-specific screenshots use the 1440 px desktop layout unless marked above as responsive.

| Case | Screenshot |
|---|---|
| Keyboard focus on a staff action control | [staff-action-keyboard-focus-1440.png](actions-taken/cases/staff-action-keyboard-focus-1440.png) |
| Edit form and successful update | [edit form](actions-taken/cases/staff-action-edit-form-1440.png), [updated action](actions-taken/cases/staff-action-edit-success-1440.png) |
| Action started and in progress | [staff-action-in-progress-1440.png](actions-taken/cases/staff-action-in-progress-1440.png) |
| Completed terminal action | [staff-action-completed-1440.png](actions-taken/cases/staff-action-completed-1440.png) |
| Successfully recorded action | [staff-action-recorded-1440.png](actions-taken/cases/staff-action-recorded-1440.png) |
| Cancellation prompt and terminal cancelled action | [confirmation](actions-taken/cases/staff-action-cancel-confirmation-1440.png), [cancelled](actions-taken/cases/staff-action-cancelled-1440.png) |
| No Actions Taken recorded | [staff-action-empty-1440.png](actions-taken/cases/staff-action-empty-1440.png) |
| Action history safe load failure and retry | [staff-action-load-failure-1440.png](actions-taken/cases/staff-action-load-failure-1440.png) |
| Create failure preserves entered values | [staff-action-create-failure-values-preserved-1440.png](actions-taken/cases/staff-action-create-failure-values-preserved-1440.png) |
| Staff Dashboard empty metrics and lists | [staff-dashboard-empty-1440.png](dashboard-states/staff-dashboard-empty-1440.png) |
| Staff Dashboard loading | [staff-dashboard-loading-1440.png](dashboard-states/staff-dashboard-loading-1440.png) |
| Staff Dashboard forbidden response | [staff-dashboard-forbidden-1440.png](dashboard-states/staff-dashboard-forbidden-1440.png) |
| Staff Dashboard safe server failure and retry | [staff-dashboard-safe-failure-1440.png](dashboard-states/staff-dashboard-safe-failure-1440.png) |

## GitHub-rendered report and repository evidence

These screenshots were captured from GitHub's HTML rendering of the PR branch or repository pages.

| Evidence | Screenshot |
|---|---|
| README rendered — top | [readme-rendered-top-1440.png](repository/readme-rendered-top-1440.png) |
| README rendered — Lab 4 section | [readme-rendered-lab4-1440.png](repository/readme-rendered-lab4-1440.png) |
| README rendered — full page | [readme-rendered-full-1440.png](repository/readme-rendered-full-1440.png) |
| Specification rendered | [specification-rendered-1440.png](repository/specification-rendered-1440.png) |
| Test plan and traceability rendered | [tests-rendered-1440.png](repository/tests-rendered-1440.png) |
| UI specification rendered | [ui-spec-rendered-1440.png](repository/ui-spec-rendered-1440.png) |
| Parts 1–9 evidence matrix rendered | [evidence-matrix-rendered-1440.png](repository/evidence-matrix-rendered-1440.png) |
| Visual/accessibility review rendered | [visual-review-rendered-1440.png](repository/visual-review-rendered-1440.png) |
| Release checklist rendered | [release-evidence-rendered-1440.png](repository/release-evidence-rendered-1440.png) |
| AI-use record rendered | [ai-use-rendered-1440.png](repository/ai-use-rendered-1440.png) |
| Peer-review record rendered | [reviewer-rendered-1440.png](repository/reviewer-rendered-1440.png) |
| PR #81 current review status | [pr-81-status-1440.png](repository/pr-81-status-1440.png) |
| Repository file structure | [repository-root-1440.png](repository/repository-root-1440.png) |
| `.gitignore` rendered | [gitignore-rendered-1440.png](repository/gitignore-rendered-1440.png) |
| `lab4-staging` commit history | [lab4-staging-commits-1440.png](repository/lab4-staging-commits-1440.png) |
| Merged Lab 4 issue PRs | [lab4-merged-prs-1440.png](repository/lab4-merged-prs-1440.png) |

## Earlier-lab regression references

Lab 2 and Lab 3 screenshots are retained in their existing folders. The current full Playwright run exercised the existing Lab 2/3 browser flows together with Lab 4; these older images are baseline references, not screenshots newly generated by the PR #81 run.

- Lab 2: [`artifacts/lab-02/screenshots/`](../../lab-02/screenshots/)
- Lab 3: [`artifacts/lab-03/screenshots/final/`](../../lab-03/screenshots/final/)
