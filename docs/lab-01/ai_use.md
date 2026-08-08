# Lab 1 — AI Use and Reflection

**LLM/agent used:** Codex

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Implement Issue 3 only: Prisma Category schema, migration, and seed. | Inspected the Prisma schema, seed file, package scripts, and env ignore rules before editing. |
| 2 | Add a Category model with id, unique name, and createdAt. | Added `Category` to `server/prisma/schema.prisma` and formatted the schema. |
| 3 | Create the migration for the Category table. | Added a Prisma migration SQL file that creates the table, primary key, default timestamp, and unique name index. |
| 4 | Seed the initial required categories safely. | Replaced the seed placeholder with `upsert` calls for Account and Access, Hardware, Software, and Network. |
| 5 | Make sure credentials are not committed. | Verified `.gitignore` ignores `.env` and `*.env` while allowing `.env.example`. |
| 6 | Update test evidence docs. | Recorded schema validation, Prisma generation, build output, seed-safety reasoning, and credential-safety evidence. |

## Reflection
The most useful prompt detail was the instruction to keep this issue separate from the API and React work, so I avoided implementing `/api/categories`. I also avoided committing any real database credentials and used a temporary `DATABASE_URL` only in validation commands. The one limitation is that I validated the schema and seed code without applying it to a live database in this environment.
