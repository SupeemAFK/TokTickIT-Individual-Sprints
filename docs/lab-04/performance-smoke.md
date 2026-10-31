# Lab 4 Dashboard Performance Smoke

Initial candidate run: 2026-10-30

Final-main rerun: 2026-10-31 on commit `5dd4ff09b425e64352cc74318bb0af9063e7ab82`.

## Setup

The smoke ran against a disposable PostgreSQL 16.15 Docker container bound to loopback. It created an isolated temporary schema and inserted 25,000 synthetic Tickets and 40,000 synthetic Actions Taken records. The test removed the schema after the run; it did not use or change application data.

## Initial candidate results

| Request | Local response time | Ticket/Action Taken queries |
|---|---:|---:|
| Staff dashboard | 114.8 ms | 8 |
| Requester dashboard | 54.4 ms | 6 |

Each dashboard returned bounded lists of at most 10 records. Query counts stayed within fixed limits as the data set grew, guarding against per-row query patterns.

PostgreSQL `EXPLAIN ANALYZE` selected `Ticket_resolvedAt_id_idx` for the recent resolved-ticket query and `ActionTaken_assignedToUserId_status_actionAt_id_idx` for My Actions. Their measured plan times in this run were 0.0 ms and 3.1 ms respectively.

These initial candidate measurements are retained as historical evidence. They are local smoke results, not production service-level targets; response times depend on the local machine and database state.

## Final-main rerun

The same smoke was rerun as part of final-main verification against disposable PostgreSQL 16.15 with 25,000 synthetic Tickets and 40,000 synthetic Actions Taken records. The temporary schema was removed after the run.

| Request | Local response time | Ticket/Action Taken queries |
|---|---:|---:|
| Staff dashboard | 78.7 ms | 8 |
| Requester dashboard | 18.7 ms | 6 |

Both dashboard lists remained bounded at 10 records. PostgreSQL selected the expected indexes for recent resolved Tickets and My Actions. The final run output is included in the separate Lab 4 submission report. These timings are local smoke results, not production service-level targets.

## Reproduction

From `server/`, set `LAB4_TEST_DATABASE_URL` to a disposable loopback PostgreSQL database and run:

```text
npm test -- --reporter=verbose --silent=false tests/lab-04/dashboard-performance.smoke.test.ts
```

The test requires a PostgreSQL 16-compatible instance and rejects database URLs that do not use `localhost`, `127.0.0.1`, or `::1`.
