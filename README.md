# Tok TickIT - IT Service Desk (Lab 1)

This project is a vertical slice of the Tok TickIT application, an IT service desk for managing Account and Access, Hardware, Software, and Network requests. This Lab 1 starter proves that the full tech stack works seamlessly from the UI down to the database.

## Tech Stack

*   **Frontend:** React, TypeScript, Vite, Bootstrap
*   **Backend:** Node.js, Express, TypeScript, REST APIs
*   **Database:** PostgreSQL, Prisma ORM
*   **Testing:** Vitest (Frontend), Supertest (Backend)

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
*   **Node.js** (v18 or higher recommended)
*   **PostgreSQL** (Running locally)
*   **Git**

---

## Setup Instructions

### 1. Database Configuration
1. Open PostgreSQL and create a new database named `toktickit`.
2. Open your terminal, navigate to the `server/` directory, and create your environment variables file:

    cd server
    cp .env.example .env

3. Open the newly created `.env` file and update the `DATABASE_URL` with your local PostgreSQL credentials.

### 2. Backend Initialization (Server)
While still in the `server/` directory, install the dependencies, set up the database schema, and start the server:

    npm install
    npx prisma migrate dev --name init
    npx prisma db seed
    npm run dev

> The server will start and expose the GET /api/health and GET /api/categories endpoints.

### 3. Frontend Initialization (Client)
Open a new terminal window, navigate to the `client/` directory, install the dependencies, and start the React app:

    cd client
    npm install
    npm run dev

> The React application will launch in your default web browser.