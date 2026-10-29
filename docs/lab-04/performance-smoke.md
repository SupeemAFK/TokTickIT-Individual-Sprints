# Lab 4 Dashboard Performance Smoke

Run date: 2026-10-30

## Setup

The smoke ran against a disposable PostgreSQL 16.15 Docker container bound to loopback. It created an isolated temporary schema and inserted 25,000 synthetic Tickets and 40,000 synthetic Actions Taken records. The test removed the schema after the run; it did not use or change application data.

## Results

| Request | Local response time | Ticket/Action Taken queries |
|---|---:|---:|
| Staff dashboard | 114.8 ms | 8 |
| Requester dashboard | 54.4 ms | 6 |

Each dashboard returned bounded lists of at most 10 records. Query counts stayed within fixed limits as the data set grew, guarding against per-row query patterns.

PostgreSQL `EXPLAIN ANALYZE` selected `Ticket_resolvedAt_id_idx` for the recent resolved-ticket query and `ActionTaken_assignedToUserId_status_actionAt_id_idx` for My Actions. Their measured plan times in this run were 0.0 ms and 3.1 ms respectively.

These are local smoke measurements from one run, not production service-level targets. Response times depend on the local machine and database state.

## Reproduction

From `server/`, set `LAB4_TEST_DATABASE_URL` to a disposable loopback PostgreSQL database and run:

```text
npm test -- --reporter=verbose --silent=false tests/lab-04/dashboard-performance.smoke.test.ts
```

The test requires a PostgreSQL 16-compatible instance and rejects database URLs that do not use `localhost`, `127.0.0.1`, or `::1`.
