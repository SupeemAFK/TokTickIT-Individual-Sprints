# Lab 1 — AI Use and Reflection

**LLM/agent used:** Codex

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Analyze the project and implement Feature #2 health check with the success criteria. | Inspected the Express app, React app, API helper, tests, and lab docs before editing. |
| 2 | Add `GET /api/health` returning HTTP 200. | Replaced the 501 stub with `{ status: "ok", service: "TokTickIT API" }`. |
| 3 | Connect the React page to a real API call. | Implemented `checkSystem()` with `fetch("/api/health")` through `VITE_API_URL` fallback and used it from the Check System button. |
| 4 | Show useful status messages. | Added loading, Online, and Offline UI states, with backend-unavailable errors shown to the user. |
| 5 | Add/update tests for the ticket. | Replaced placeholder frontend tests with success and failure status tests and ran the existing backend health test. |
| 6 | Update `docs/lab-01/tests.md`. | Recorded only Issue 2 health-check test evidence. |

## Reflection
Clear acceptance criteria made the implementation smaller: the health ticket only needed the backend health route and frontend status display. I skipped the category route and category list UI because those belong to Issue 4 and are blocked by another task. The main correction was adjusting the frontend tests away from category-list expectations and toward the real health-check behavior required by this ticket.
