# Tok TickIT - IT Service Desk (Lab 1)

This project is a vertical slice of the Tok TickIT application, an IT service desk for managing Account and Access, Hardware, Software, and Network requests. This Lab 1 starter proves that the full tech stack works seamlessly from the UI down to the database.

## 🛠 Tech Stack

*   **Frontend:** React, TypeScript, Vite, Bootstrap
*   **Backend:** Node.js, Express, TypeScript, REST APIs
*   **Database:** PostgreSQL, Prisma ORM
*   **Testing:** Vitest (Frontend), Supertest (Backend)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [PostgreSQL](https://www.postgresql.org/) (Running locally)
*   Git

## 🚀 Setup Instructions

### 1. Database Configuration
1. Open PostgreSQL and create a new database named `toktickit` (or your preferred name).
2. Navigate to the `server/` directory and create a `.env` file by copying the example:
   ```bash
   cp .env.example .env