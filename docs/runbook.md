# Runbook

## Prerequisites

- **Node.js 20** (see root `.nvmrc`)
  - Use `nvm use` in the repo root to switch to the correct version

## Local Development (Docker)

1. Copy the example env file:
   - `cp .env.example .env`
2. Start the stack:
   - `docker compose up --build`
3. Visit the frontend at `http://localhost:3000`.

> TypeORM migrations run automatically on backend startup.
> Sample data is automatically seeded on first startup (2 campaigns with content pieces).
> Set `SKIP_SEED=true` to disable seeding.
> Backend and frontend services are placeholders until the app is implemented.

## Local Development (No Docker)

1. Copy the example env file:
   - `cp .env.example .env`
2. Start PostgreSQL locally and ensure `DATABASE_URL` in `.env` points to it.
3. Install backend dependencies:
   - `cd backend && npm install`
4. Run the backend in dev mode:
   - `npm run start:dev`
5. Install frontend dependencies (in another terminal):
   - `cd frontend && npm install`
6. Run the frontend:
   - `npm run dev`
7. Visit the frontend at `http://localhost:3000`.

> Set `VITE_API_URL` and `VITE_WS_URL` in `.env` if your backend is not on `http://localhost:4000`.

## Environment Variables

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `BACKEND_PORT`, `FRONTEND_PORT`
- `OPENAI_API_KEY`
- `VITE_API_URL`
- `SKIP_SEED` - Set to `true` to disable automatic seeding of sample data
