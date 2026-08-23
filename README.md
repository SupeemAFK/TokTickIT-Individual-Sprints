# Tok TickIT - IT Service Desk

This project is a vertical slice of the Tok TickIT application, an IT service desk for managing Account and Access, Hardware, Software, and Network requests. This Lab 1 starter proves that the full tech stack works seamlessly from the UI down to the database.

## Tech Stack

*   **Frontend:** React, TypeScript, Vite, Bootstrap
*   **Backend:** Node.js, Express, TypeScript, REST APIs
*   **Database:** PostgreSQL, Prisma ORM
*   **Testing:** Vitest (Frontend), Supertest (Backend)

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
*   **Node.js** (v18 or higher recommended)
*   **Docker** (For running the database easily)
*   **Git**

---

## Setup Instructions

### 1. Clone the Repository
Open your terminal and clone the repository to your local machine:

    git clone https://github.com/SupeemAFK/TokTickIT-Individual-Sprints.git
    cd toktickit

### 2. Database Configuration (Docker)
1. Spin up a local PostgreSQL instance using Docker by running this command in your terminal:
```
    docker run --name toktickit-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres
```
2. Navigate to the `server/` directory and create your environment variables file:
```
    cd server
    cp .env.example .env
```
3. Open the newly created `.env` file and set your `DATABASE_URL` exactly like this to match the Docker container:
```
    DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/toktickit?schema=public"
```
### 3. Backend Initialization (Server)
While still in the `server/` directory, install dependencies, initialize the database, and start the server:

    npm install
    npx prisma migrate dev --name init
    npx prisma db seed
    npm run dev

> The backend server will start (usually on http://localhost:3000).

### 4. Frontend Initialization (Client)
Open a new terminal window, navigate to the `client/` directory, install dependencies, and start the React app:

    cd client
    npm install
    npm run dev

> The React application will launch in your default web browser (usually on http://localhost:5173).

---

## Available API Endpoints

Once the backend is running, the following REST API endpoints are available:

*   **`GET /api/health`**
    *   **Description:** Health check to verify the backend and API are online.
    *   **Response (200 OK):** `{"status": "ok", "service": "TokTickIT API"}`.

*   **`GET /api/categories`**
    *   **Description:** Retrieves the list of seeded IT request categories (Account and Access, Hardware, Software, Network).
    *   **Response (200 OK):** Array of category objects containing `id` and `name`.

---

## Running Tests

To verify the setup, you can run the automated tests required for Lab 1:

**Backend Tests (Supertest):**
Tests the health and category endpoints.

    cd server
    npm test

**Frontend Tests (Vitest):**
Tests the UI rendering and API connection.

    cd client
    npm test