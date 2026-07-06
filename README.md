# Delegate - Full-Stack Scheduling PWA

Delegate is a modern, mobile-first Progressive Web App (PWA) designed for teams and organizations to manage operations, coordinate tasks, communicate via group/private chat, and view assignments in an interactive calendar.

This project features high-contrast **Neon Volt / Bright Yellow** branding inside a sleek dark theme.

---

## Tech Stack
* **Frontend**: React, TypeScript, Vite, Tailwind CSS, Vite PWA Plugin
* **Backend**: Node.js, Express.js, TypeScript
* **Database**: PostgreSQL (Production) / SQLite (Local Development) via Prisma ORM
* **Authentication**: JWT (JSON Web Tokens) with custom role authorization

---

## Folder Structure
```
delegate-app/
├── render.yaml                 # Render blueprint for infrastructure deployment
├── README.md                   # Setup and development instructions
├── .gitignore                  # Git exclusions
├── backend/                    # Node Express API
│   ├── prisma/                 # Database models and schema
│   ├── src/                    # API source code (auth, business, jobs, chat)
│   └── package.json
└── frontend/                   # React PWA client
    ├── src/                    # UI elements, state context, custom page views
    ├── tailwind.config.js      # Color system custom configuration
    └── package.json
```

---

## Quick Start (Local Development)

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [npm](https://www.npmjs.com/) (installed with Node)

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your local environment file `.env`:
   ```env
   PORT=5000
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="local-development-secret-key-12345"
   NODE_ENV="development"
   ```
4. Run migrations to initialize the SQLite database:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   The backend API will run on [http://localhost:5000](http://localhost:5000).

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. Start the frontend developer server:
   ```bash
   npm run dev
   ```
   The application will run on [http://localhost:5173](http://localhost:5173).

---

## Production Deployment to Render

This project contains a `render.yaml` file, which enables one-click deployment.

1. Push this project to your GitHub repository.
2. In your Render Dashboard, click **New** -> **Blueprint**.
3. Select your GitHub repository.
4. Render will read `render.yaml` and provision:
   * A Managed PostgreSQL database.
   * A Web Service for the Express backend.
   * A Static Site for the React frontend.
