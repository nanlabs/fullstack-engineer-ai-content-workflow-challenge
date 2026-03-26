# Provider UI Practical Security

## Summary

Keep provider switching in the web UI while tightening the realistic security boundary:

- the API key may travel once in the HTTPS request body when the user saves it
- it never goes through query params
- it is never returned by the API
- it is encrypted at rest in PostgreSQL
- it is never rehydrated into the UI after save
- it is never persisted in browser storage

## Key Changes

- Keep the current encrypted-at-rest provider settings model and only store ciphertext plus fingerprint in the database.
- Harden `PUT /settings/ai-provider` so `api_key` is accepted only in the JSON body and rejected if sent via query params.
- Use a secret-aware request schema in backend to reduce accidental exposure in reprs, validation, or logs.
- Keep the provider settings modal and settings page, but ensure the API key input always stays local to the modal, is cleared on save and close, and is never prefilled.
- Update copy in the modal and README to make the security boundary explicit and technically honest.

## Test Plan

- `GET /settings/ai-provider` never returns an API key.
- `PUT /settings/ai-provider` stores ciphertext in DB and rejects `api_key` in query params.
- Switching providers with a new key still works.
- Keeping the same provider without a new key still preserves the existing stored key.
- The modal input stays `password`, is not prefilled, and is cleared after save or close.

## Assumptions

- The challenge keeps provider switching in the browser UI.
- A web app cannot hide the initial save request body from the browser itself; the realistic goal is to avoid every other exposure path.
