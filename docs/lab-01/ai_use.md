# Lab 1 — AI Use and Reflection

**LLM/agent used:** Codex

## Issue 2 — API Health Check

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Analyze the project and implement Feature #2 health check with the success criteria. | Inspected the Express app, React app, API helper, tests, and lab docs before editing. |
| 2 | Add `GET /api/health` returning HTTP 200. | Replaced the health route stub with `{ status: "ok", service: "TokTickIT API" }`. |
| 3 | Connect the React page to a real API call. | Implemented `checkSystem()` using `VITE_API_URL` with a localhost fallback. |
| 4 | Show useful health status messages. | Added loading, Online, and Offline states for the health-check workflow. |
| 5 | Add/update tests for the ticket. | Added frontend success and failure tests and ran the existing Supertest health test. |
| 6 | Update `docs/lab-01/tests.md`. | Recorded the Issue 2 health-check evidence separately from later category work. |

Reflection: Clear acceptance criteria kept Issue 2 small. I did not implement category API or category UI work during that ticket because those belonged to Issue 4 and were blocked by Issue 3.

## Issue 3 — Category Schema and Seed

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Implement Issue 3 only: Prisma Category schema, migration, and seed. | Inspected the Prisma schema, seed file, package scripts, and env ignore rules before editing. |
| 2 | Add a Category model with id, unique name, and createdAt. | Added `Category` to `server/prisma/schema.prisma` and formatted the schema. |
| 3 | Create the migration for the Category table. | Added a Prisma migration SQL file that creates the table, primary key, default timestamp, and unique name index. |
| 4 | Seed the initial required categories safely. | Replaced the seed placeholder with `upsert` calls for Account and Access, Hardware, Software, and Network. |
| 5 | Make sure credentials are not committed. | Verified `.gitignore` ignores `.env` and `*.env` while allowing `.env.example`. |
| 6 | Update test evidence docs. | Recorded schema validation, Prisma generation, build output, seed-safety reasoning, and credential-safety evidence. |

Reflection: The most important constraint was keeping Issue 3 separate from the API and React work. The seed uses `upsert`, so running it repeatedly will not create duplicate category names.

## Issue 4 — Category List

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Implement Feature #4 on branch `feature/4-category-list` after Issues 2 and 3. | Confirmed the branch and inspected the existing Express, Prisma, React, Supertest, Vitest, and docs patterns. |
| 2 | Add `GET /api/categories` backed by PostgreSQL through Prisma. | Implemented the Express route with `getPrisma().category.findMany()`, selecting only `id` and `name`. |
| 3 | Return categories in a predictable order. | Ordered the Prisma query by ascending `id`. |
| 4 | Add Supertest coverage. | Replaced the category test TODO with Supertest assertions for the response body and Prisma query contract. |
| 5 | Display API categories in React with loading and error states. | Added `fetchCategories()` and rendered the loaded category list instead of hard-coded UI values. |
| 6 | Add Vitest UI coverage and update docs. | Added category loading, success, and error UI tests, then recorded the passing test/build evidence. |

Reflection: Issue 4 depends on the previous two tickets: Issue 2 provided the working Express/React API pattern, and Issue 3 provided the Prisma Category model plus seeded category names. I mocked the Prisma boundary in the Supertest test so the route behavior is deterministic while the production route still reads from PostgreSQL through Prisma.
