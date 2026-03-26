# Fix Plan for Campaign/Piece Fetch 500s After Metadata Schema Change

## Summary

This does not look like a hydration problem. The likely failure point is backend serialization when loading a campaign or content piece that still has old metadata rows in `structured_output_json`.

Current state:
- the app now validates metadata against the expanded schema
- older seeded rows may still only contain `keywords`, `tone`, and `sentiment`
- when those old rows are loaded, `MetadataPayload.model_validate(...)` can raise and turn `GET /campaigns/:id` or `GET /content-pieces/:id` into `500`

The chosen handling is `Force reseed`: treat this as stale demo data and recreate the seeded campaign with the current schema, instead of adding backward compatibility for old metadata rows.

## Key Changes

### Immediate operational fix
- Rerun the demo seed with the current code:
  - `cd backend && uv run seed-demo`
- This should recreate `ACME Media | Creator Launch Demo` by name with metadata rows that match the new schema.

### Small code hardening
- Improve frontend fetch error reporting in `fetchCampaign` and `fetchContentPiece` so failures include the backend response body instead of only:
  - `Failed to fetch campaign`
  - `Failed to fetch content piece`

### Documentation
- Add a short note to the README demo-seed section that when the metadata schema changes, the demo dataset should be regenerated with `uv run seed-demo`.

## Test Plan

- Run `cd backend && uv run seed-demo`
- Open the seeded campaign and verify:
  - `GET /campaigns/:id` no longer fails
  - `GET /content-pieces/:id` no longer fails
  - the editor loads with and without `?lab=1`
  - metadata panel renders correctly for seeded pieces

## Assumptions

- The failing campaign/piece belongs to an older seeded dataset created before the metadata schema expansion.
- The preferred fix is reseeding demo data rather than adding legacy metadata compatibility.
