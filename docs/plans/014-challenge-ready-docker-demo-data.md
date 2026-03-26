# Challenge-Ready Docker + Demo Data Plan

## Summary

Make the challenge reviewer flow genuinely one-command:

- `docker compose --env-file .env.docker.example up --build`
- app boots without AI keys
- demo campaign is seeded automatically
- real AI remains optional through `.env` or in-app `Settings`

## Changes

1. Add a one-shot `seed` service to `compose.yml`.
2. Add a backend healthcheck and make the frontend wait for healthy backend plus completed seed.
3. Pass the full provider/settings env set into Docker runtime.
4. Switch the frontend container from `dev` to a production build/runtime image.
5. Harden the backend image with `uv.lock` and frozen installs.
6. Rewrite the README around a short reviewer-first Docker path and document that demo data loads automatically.

## Validation

- `docker compose --env-file .env.docker.example up --build` leaves the demo campaign available in the UI.
- No AI key is required to boot the stack or review the seeded flow.
- Real AI can be enabled either by filling env vars or by saving a provider from `Settings`.
