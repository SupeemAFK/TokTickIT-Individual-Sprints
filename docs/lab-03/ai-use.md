# Lab 3 AI Use Record

OpenAI Codex was used as a specification and coding assistant. The student remains responsible for reviewing the Lab 3 handout, decisions, code, migrations, tests, review feedback, and evidence. The prompts below are selected excerpts from the actual task instructions used during this sprint; they are summarized only where needed for readability.

## Selected prompt traceability

| # | Prompt excerpt | Resulting decision or change |
|---|---|---|
| 1 | “Please check what lab3 need to do branching, reviews, features and other things.” | Converted the labsheet into the Lab 3 contract, acceptance criteria, and staged branch workflow in [PR #50](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/50). |
| 2 | “Look at the lab3_labsheet.pdf every time and analyze projects... current project structure and status.” | Re-read the handout before each release decision and checked implementation, tests, docs, issues, and prior PRs before accepting work. This guided [PR #51](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/51) through [PR #57](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/57). |
| 3 | “Please add issue number for PR and also it render broken...” | Kept PR descriptions tied to one issue and corrected release evidence formatting and traceability instead of accepting malformed rendered text. |
| 4 | “My friend review and request some changes. Please take a look and fix it.” | Treated collaborator review as a gate: contract ambiguity, authentication security, Requester regression, queue coverage, ticket operations, administration, and test traceability were corrected across [PR #50](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/50), [#51](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/51), [#53](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/53), [#54](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/54), [#55](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/55), [#56](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/56), and [#57](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/57). |
| 5 | “Please don't trust everything if you think it is not makes sense...” | Compared proposed scope against the labsheet and the corresponding issue before proceeding; incomplete or duplicate scope was not treated as completed evidence. |
| 6 | “Why do you think #51 is overscoped? Does it actually?” | Audited the live PR title, base branch, changed files, issue link, and review history before deciding whether the implementation matched Issue #36. |
| 7 | “What should do next... revert and do it again? or continue?” | Kept the approved merged staging history, corrected stale records, and continued toward final release rather than rewriting valid reviewed implementation. |
| 8 | “Don't create PDF yet if it will be final after this one.” | Deferred the single submission PDF until final `main` verification so its links, test output, screenshots, and branch history cannot become stale. |

## My Reflection

The specification work was used to turn the handout into numbered functional requirements, business rules, authorization decisions, API/UI contracts, acceptance criteria, and a test traceability plan before treating implementation as complete. The coding work was checked against those documents and against the repository rather than accepted solely from generated output.

Peer review materially improved the increment. In particular, review exposed incomplete session and authorization behavior, missing authenticated Requester regression coverage, unclear API response shapes, incomplete queue and administrator UI coverage, and an inaccurate E2E mapping for queue behavior. Those findings were resolved in the reviewed PRs, and the final test record still distinguishes staging validation from final `main` verification.

The remaining release discipline is intentional: screenshots and the one required PDF must be based on the final `main` branch, and no final completion claim is made until the final commands, review evidence, Project #10 status, and integration history are verified.
