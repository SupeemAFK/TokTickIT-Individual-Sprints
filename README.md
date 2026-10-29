# TokTickIT — IT Service Desk

TokTickIT is a small service-desk application for Account and Access, Hardware, Software, and Network requests. The integrated Labs 1–4 application supports authenticated Requesters, IT Staff, and Administrators; ticket creation and ownership; attachments and comments; staff ticket operations; Actions Taken; safe ticket resolution; and role-specific dashboards.

## Tech Stack

*   **Frontend:** React, TypeScript, Vite, Bootstrap
*   **Backend:** Node.js, Express, TypeScript, REST APIs
*   **Database:** PostgreSQL, Prisma ORM
*   **Testing:** Vitest (Frontend), Supertest (Backend)

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
*   **Node.js** (v18 or higher)
*   **Docker** (for a local PostgreSQL database) or a local PostgreSQL 16 instance
*   **Git**

---

## Setup Instructions

### 1. Clone the Repository
Open your terminal and clone the repository to your local machine:

    git clone https://github.com/SupeemAFK/TokTickIT-Individual-Sprints.git
    cd TokTickIT-Individual-Sprints

### 2. Database Configuration (Docker)
1. Spin up a local PostgreSQL instance using Docker by running this command in your terminal:
```
    docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres:16
```
2. Navigate to the `server/` directory and copy the example environment file:
```
    cd server
    cp .env.example .env
```
The checked-in `server/.env.example` already contains the local Docker connection string used above. Keep real `.env` files out of Git.

### 3. Backend initialization

From the `server/` directory, install dependencies, apply migrations, seed the local demo data, and start the API:

    npm ci
    npx prisma migrate dev
    npm run prisma:seed
    npm run dev

> The backend server will start (usually on http://localhost:3000).

### 4. Frontend initialization

In a second terminal, navigate to `client/`, install dependencies, and start the React app:

    cd client
    npm ci
    npm run dev

> The React application will launch in your default web browser (usually on http://localhost:5173).

---

## Seeded demonstration accounts

Running `npm run prisma:seed` creates local-only accounts with the initial password `Lab3Pass123`. Every seeded account has `mustChangePassword=true` and must change this password after login. Do not use these development-only credentials outside a local demo.

| Role | Email examples |
|---|---|
| Requester | `nicha.somchai@toktickit.test`, `anan.kittisak@toktickit.test`, `mali.charoen@toktickit.test`, `preecha.wattanakul@toktickit.test` |
| IT Staff | `arun.support@toktickit.test`, `bua.support@toktickit.test`, `chai.support@toktickit.test` |
| Administrator | `admin@toktickit.test` |

Passwords are stored as unique-salt scrypt hashes and are never returned by the API. The seed includes Lab 4 workflow examples: `TKT-2026-000901` has multiple Actions Taken, `TKT-2026-000902` has none, and `TKT-2026-000903` has one. Tickets `TKT-2026-000901` through `TKT-2026-000914` cover active, waiting, resolved, closed, reopened, and cancelled states, with different owners, action assignees, and performers.

## Available API Endpoints

Once the backend is running, the following REST API endpoints are available:

*   **`GET /api/health`**
    *   **Description:** Health check to verify the backend and API are online.
    *   **Response (200 OK):** `{"status": "ok", "service": "TokTickIT API"}`.

*   **`GET /api/categories`**
    *   **Description:** Retrieves the list of seeded IT request categories (Account and Access, Hardware, Software, Network).
    *   **Response (200 OK):** Array of category objects containing `id` and `name`.

---

## Running tests

Run the client and server unit/API suites and production builds, then the complete browser suite:

```text
cd server
npm test
npm run build
cd ../client
npm test
npm run build
npm run test:e2e
```

The server suite covers API, unit, migration, seed, and dashboard performance behavior. Database-backed migration and performance tests run only when `LAB4_TEST_DATABASE_URL` points to a disposable PostgreSQL database on loopback; otherwise Vitest reports those database checks as skipped. Each database-backed test creates and drops a unique temporary schema and leaves the database's `public` schema unchanged.

To run all server tests, including database-backed checks, start a disposable PostgreSQL container on a free local port:

```text
docker run --rm -d --name toktickit-lab4-test-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit_test -e POSTGRES_DB=toktickit -p 127.0.0.1:55432:5432 postgres:16
```

Set `LAB4_TEST_DATABASE_URL` to `postgresql://toktickit:toktickit_test@127.0.0.1:55432/toktickit?schema=public` in the terminal running `npm test` from `server/`. In PowerShell, use `$env:LAB4_TEST_DATABASE_URL = "postgresql://toktickit:toktickit_test@127.0.0.1:55432/toktickit?schema=public"`; in Bash, use `export LAB4_TEST_DATABASE_URL="postgresql://toktickit:toktickit_test@127.0.0.1:55432/toktickit?schema=public"`. Stop the container after the test run with `docker stop toktickit-lab4-test-db`.

### End-to-End Tests

Install the Playwright browser once after installing client dependencies, then run the authenticated Lab 1–4 workflows:

```text
cd client
npx playwright install chromium
npm run test:e2e
```

The E2E suite uses stateful browser fixtures and covers authentication, mandatory first-login password change, Requester and Staff dashboards, Actions Taken, the Ticket resolution gate, Administrator user management, and desktop/tablet/mobile layouts.

## Lab 4 demonstration

1. Start the API and client using the setup steps above, then sign in with one of the seeded accounts and change its initial password.
2. As a Requester, review My Tickets and the Requester Dashboard. Dashboard lists and metrics open only Tickets linked to that account.
3. As IT Staff, open the Staff Dashboard and Ticket Queue. Review My Actions and the active Tickets, then open `TKT-2026-000901` to see multiple Actions Taken.
4. Try resolving a Ticket while an Action Taken is OPEN or IN_PROGRESS. The API blocks resolution until each active action is completed or cancelled.

The Lab 4 requirements, API/UI contracts, acceptance traceability, performance run, reviewer history, AI-use record, and release checklist are in [`docs/lab-04/`](docs/lab-04/). The responsive screenshots are under [`artifacts/lab-04/screenshots/`](artifacts/lab-04/screenshots/), with a [viewport index](artifacts/lab-04/screenshots/README.md). The single Answer Parts 1–9 submission PDF is a separate artifact and will be prepared after final `main` verification; it is not committed to this repository.

## Lab 2 Documentation and Evidence

The engineering contract, API/UI specifications, test traceability, peer-review record, AI-use record, and responsive screenshots are versioned under [`docs/lab-02/`](docs/lab-02/) and [`artifacts/lab-02/screenshots/`](artifacts/lab-02/screenshots/).

## Lab 3 Documentation and Evidence

The Lab 3 engineering contract, API/UI specifications, test traceability, peer-review record, AI-use record, and final evidence are versioned under [`docs/lab-03/`](docs/lab-03/) and [`artifacts/lab-03/screenshots/`](artifacts/lab-03/screenshots/). The final report is prepared after the verified `main` branch contains the completed implementation and evidence.
