# Lab 4 AI Use Record

OpenAI Codex, using a GPT-6-based assistant (the exact model identifier is not exposed in this chat), assisted with reading the lab requirements, repository analysis, issue planning, implementation, regression tests, performance checks, documentation, and review-response work. The student remains responsible for understanding and verifying the handout, code, test results, peer-review history, and submitted evidence. The prompt excerpts below are selected from the actual instructions in this task; they are shortened only for readability.

## Selected prompt traceability

| # | Prompt excerpt | Resulting decision or work |
|---|---|---|
| 1 | “Based on the pdf what it says or it need to tracked?” | Identified the Lab 4 requirements and evidence that needed version control; recorded acceptance criteria and test traceability in the Lab 4 contract and plan. |
| 2 | “What about tickets and stuff? … you have to create tickets right?” | Created a focused issue sequence for the Lab 4 work rather than treating the handout as an untracked task list. |
| 3 | “How many tickets you're gonna create to follow task and step … follow lab4 pdf and … see codebase” | Mapped the work to issues #64–#72 and checked their scope against the existing repository and the handout. |
| 4 | “I dont want branch like lab4 and stuff … use convention like feat, fix and chore” | Followed the Lab 4 branch pattern `<type>/<issue>-<topic>` and Conventional Commit subjects; for example, this release-evidence branch is `chore/72-release-evidence`. |
| 5 | “Reset and start everything for lab4 … read lab4 pdf again … small changes” | Rebased the plan on a clean staging workflow and kept implementation focused by issue; this record does not claim the discarded broad change set as project work. |
| 6 | “After you done each PR send here since I have to peer review with my friend and let my friend merge” | Opened one issue PR at a time to `lab4-staging` and left merge decisions to the collaborator. PRs #73–#80 were reviewed and merged in sequence. |
| 7 | “He review and request changes … take a look if valid then fix” | Examined each collaborator request against the contract, corrected valid issues, and recorded the real changes-requested and approval history in [`reviewer.md`](reviewer.md). |
| 8 | “Nice it got merged now please proceed with next step” | Continued only after each preceding PR was merged, then verified PR #80's merge before starting issue #72 from the updated `lab4-staging` head. |

## Student reflection draft

**Draft for the student to review and personalize before submission; this is not represented as a final student-authored reflection.**

> I learned that breaking the handout into issue-sized work and linking each issue to tests made it easier to see what was complete and what still needed evidence. Peer review found requirements that could have been missed by implementation alone, including exact dashboard drill-down behavior, safe seed reruns, and retry handling. Keeping one PR per issue also made it easier to review fixes without mixing unrelated changes. Before submitting, I still need to check the final `main` commit, verify the release evidence against it, and edit this reflection so it accurately describes my own work and learning.
