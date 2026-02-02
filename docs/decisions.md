# Decisions

## REST over GraphQL
REST keeps the API simple and pairs well with Socket.io for real-time updates.

## NestJS + React (Vite)
Vite keeps the frontend lightweight, fast to iterate, avoids extra framework complexity, and pairs cleanly with a REST API plus Socket.io.

## Minimal Testing
Only AI integration is unit-tested to stay lean for the challenge scope.

## Docker-First Setup
Docker Compose standardizes local setup and keeps the challenge easy to run.

## Automatic Database Seeding
A SeedService with `OnApplicationBootstrap` automatically inserts sample data if the database is empty. This provides immediate test data for API exploration without manual setup. The seeding is idempotent (checks for existing data) and can be disabled via `SKIP_SEED` environment variable.
