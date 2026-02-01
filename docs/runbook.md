# Runbook

## Local Development (Docker)

1. Copy the example env file:
   - `cp .env.example .env`
2. Start the stack:
   - `docker compose up --build`
3. Visit the frontend at `http://localhost:3000`.

> Backend and frontend services are placeholders until the app is implemented.

## Environment Variables

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `BACKEND_PORT`, `FRONTEND_PORT`
- `OPENAI_API_KEY`
- `VITE_API_URL`
