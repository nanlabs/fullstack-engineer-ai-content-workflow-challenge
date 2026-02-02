# Runbook

## Prerequisites

- **Node.js 20** (see `.nvmrc` in backend folder)
  - Use `nvm use` in the `backend/` directory to switch to the correct version

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

## Environment Variables

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `BACKEND_PORT`, `FRONTEND_PORT`
- `OPENAI_API_KEY`
- `VITE_API_URL`
- `SKIP_SEED` - Set to `true` to disable automatic seeding of sample data
