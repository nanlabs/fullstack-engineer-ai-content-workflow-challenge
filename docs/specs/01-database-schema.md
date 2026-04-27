# Spec 01 — Database Schema & Migrations

## Goal

Model the domain in PostgreSQL: campaigns, content pieces, drafts, versioned prompts, and storage for LangGraph checkpoints. Migrations are managed with Alembic.

## Out of scope

- Endpoints (spec 02).
- AI logic (spec 03+).
- Inserting data at runtime (this spec only defines structure + initial seed).

## Data model

### Diagram

```
campaign ──< content_piece ──< draft >── prompt_template
                                  │
                                  └── workflow_run (1:1)
                                        │
                                        └── (LangGraph checkpoints, separate tables)
```

### Tables

#### `campaign`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | default `gen_random_uuid()` |
| `name` | `VARCHAR(200)` NOT NULL | |
| `brief` | `TEXT` | campaign description |
| `target_languages` | `VARCHAR(10)[]` NOT NULL DEFAULT `'{}'` | e.g. `{en,es,pt-BR,fr}` |
| `source_language` | `VARCHAR(10)` NOT NULL DEFAULT `'en'` | |
| `created_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | trigger update |

#### `content_piece`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | |
| `campaign_id` | `UUID` NOT NULL FK → campaign(id) ON DELETE CASCADE | |
| `type` | `content_piece_type` NOT NULL | enum: `headline`, `description`, `cta`, `body` |
| `source_text` | `TEXT` | optional human input (concrete brief) |
| `title` | `VARCHAR(200)` | internal name to identify the piece |
| `created_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | |

Index: `(campaign_id, created_at DESC)`.

#### `draft`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | |
| `content_piece_id` | `UUID` NOT NULL FK → content_piece(id) ON DELETE CASCADE | |
| `language` | `VARCHAR(10)` NOT NULL | |
| `status` | `draft_status` NOT NULL DEFAULT `'draft'` | enum |
| `ai_content` | `TEXT` | original LLM output |
| `edited_content` | `TEXT` | human-edited version (NULL if not edited) |
| `model_used` | `VARCHAR(100)` | e.g. `claude-3-5-sonnet-20241022` |
| `provider` | `VARCHAR(50)` | `anthropic` \| `openai` \| `mock` |
| `prompt_template_id` | `UUID` FK → prompt_template(id) | nullable, for initial drafts without a template |
| `metadata` | `JSONB` | `{tokens_in, tokens_out, latency_ms, cost_usd, sentiment, keywords[], tone}` |
| `parent_draft_id` | `UUID` FK → draft(id) | nullable, for regenerations (lineage) |
| `reviewed_by` | `VARCHAR(100)` | nullable, mock user (use `"reviewer@acme.com"` for now) |
| `reviewed_at` | `TIMESTAMPTZ` | nullable |
| `review_notes` | `TEXT` | human feedback (used for refinement) |
| `created_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | |

Indexes:
- `(content_piece_id, language, created_at DESC)` — for "latest draft of this piece in this language"
- `(status)` — for queries by state

#### `prompt_template`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | |
| `name` | `VARCHAR(100)` NOT NULL | e.g. `headline_generation` |
| `version` | `INTEGER` NOT NULL | start at 1 |
| `template` | `TEXT` NOT NULL | with placeholders like `{brief}`, `{language}` |
| `description` | `TEXT` | what it does, when to use it |
| `default_model` | `VARCHAR(100)` | suggested model |
| `created_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | |

Unique: `(name, version)`.

#### `workflow_run`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | |
| `content_piece_id` | `UUID` NOT NULL FK → content_piece(id) ON DELETE CASCADE | |
| `langgraph_thread_id` | `VARCHAR(100)` NOT NULL | LangGraph `thread_id` |
| `status` | `workflow_status` NOT NULL DEFAULT `'pending'` | enum: `pending`, `running`, `awaiting_human`, `completed`, `failed` |
| `current_node` | `VARCHAR(100)` | current node name |
| `error` | `TEXT` | if failed |
| `started_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | |
| `finished_at` | `TIMESTAMPTZ` | |

Index: `(content_piece_id, started_at DESC)`.

### Enums

```sql
CREATE TYPE content_piece_type AS ENUM ('headline', 'description', 'cta', 'body');
CREATE TYPE draft_status AS ENUM ('draft', 'suggested', 'reviewed', 'approved', 'rejected');
CREATE TYPE workflow_status AS ENUM ('pending', 'running', 'awaiting_human', 'completed', 'failed');
```

### `updated_at` trigger

Standard PG function that sets `updated_at = now()` on every UPDATE. Apply to `campaign`, `content_piece`, `draft`.

## SQLAlchemy implementation

Layout `backend/src/db/`:

```
db/
├── __init__.py
├── base.py              # DeclarativeBase
├── session.py           # async_sessionmaker, get_session dep
├── enums.py             # Python enums mirroring PG enums
└── models/
    ├── __init__.py
    ├── campaign.py
    ├── content_piece.py
    ├── draft.py
    ├── prompt_template.py
    └── workflow_run.py
```

Pattern (SQLAlchemy 2.0.49, `Mapped[...]` style):

```python
class Campaign(Base):
    __tablename__ = "campaign"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200))
    brief: Mapped[str | None] = mapped_column(Text)
    target_languages: Mapped[list[str]] = mapped_column(ARRAY(String(10)), default=list)
    source_language: Mapped[str] = mapped_column(String(10), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    content_pieces: Mapped[list["ContentPiece"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")
```

## Alembic

### Initial setup

```bash
cd backend
uv run alembic init -t async alembic
```

Edit `alembic/env.py` to:
1. Import all models: `from src.db.models import *`
2. `target_metadata = Base.metadata`
3. Read `DATABASE_URL` from `src.config.settings`

### First migration

```bash
uv run alembic revision --autogenerate -m "initial schema"
```

Review the generated file by hand:
- Verify enums are created BEFORE the tables that use them.
- Add the `updated_at` trigger as `op.execute(...)`.
- Verify indexes.

### LangGraph checkpointer

LangGraph creates its own tables (`checkpoints`, `checkpoint_writes`, etc.) when `PostgresSaver` is initialized. **We don't create them**, LangGraph manages them. They live in the same DB. Document this.

## Seed data

`backend/scripts/seed.py` — standalone script that creates:
- 1 campaign: "Spring Sale 2026"
- 3 content pieces: 1 headline, 1 description, 1 CTA
- target_languages: `['en', 'es', 'pt-BR']`
- 2 initial prompt templates: `headline_generation` v1, `translation` v1

Run with:
```bash
uv run python -m scripts.seed
```

## Acceptance criteria

- [x] `docker compose up` brings up postgres with the `acme_content` DB. *(service name is `db`, not `postgres`)*
- [x] `uv run alembic upgrade head` runs cleanly with no errors.
- [x] Connect to the DB and `\dt` shows all tables.
- [x] Connect to the DB and `\dT` shows the enums.
- [x] `uv run python -m scripts.seed` leaves the DB with the demo campaign.
- [x] `SELECT * FROM campaign;` returns the campaign.
- [x] Tests:
  - `tests/db/test_models.py`: create a Campaign with a ContentPiece and a Draft, flush, assert that cascade works on campaign deletion.

## Suggested commit plan

```
feat(db): add postgres service to docker compose
feat(db): scaffold sqlalchemy models for campaign and content_piece
feat(db): add draft model with status enum and metadata jsonb
feat(db): add prompt_template and workflow_run models
feat(db): configure alembic with async support
feat(db): add initial migration creating all tables and enums
feat(db): add updated_at trigger
chore(db): add seed script with demo campaign
test(db): cover model relationships and cascading deletes
```

## Implementation notes (deviations from the spec)

- **`content_metadata` ≠ `metadata`:** The Python ORM attribute on `Draft` is named `content_metadata` and mapped to DB column `metadata` via `mapped_column("metadata", JSONB)`. SA documents `metadata` as a reserved attribute name on `DeclarativeBase`; using it directly would shadow the `Base.metadata` MetaData object.
- **`enum.StrEnum` instead of `(str, enum.Enum)`:** Python 3.11+ built-in that is cleaner and supported by SA 2.0 without changes. Since the project requires Python ≥ 3.12 this is always available.
- **Migration is hand-written, not autogenerated:** `alembic revision --autogenerate` requires a live DB connection at generation time and an existing empty schema to diff against. Writing the migration by hand avoids this chicken-and-egg problem and produces a more reviewable, self-documenting file.
- **`config.py` searches `(".env", "../.env")`:** Commands run from `backend/` but the `.env` lives at the repo root. Pydantic Settings accepts a tuple of paths and uses the first match.
- **DB tests use function-scoped fixtures:** A module-scoped engine created in pytest-asyncio 1.x shares a connection pool across function-scoped test event loops, causing asyncpg "Future attached to different loop" errors. Each test creates its own engine (cheap) and rolls back its session after.

## Documented trade-offs (move to ADR if surface-level)

- **JSONB for metadata vs typed columns:** JSONB chosen because the metadata varies (sentiment may be float or categorical, keywords is an array, etc.). Trade-off: less efficient queries on those fields. Mitigation: if you later want to filter by sentiment, add a GIN index.
- **Drafts as a separate table vs columns on content_piece:** separate, because we need history and regenerations. Trade-off: one more query for "current state".
- **Translations as drafts with `language` vs separate table:** drafts with `language`. Avoids schema duplication and lets us treat all AI outputs uniformly.

## Notes

- Use `UUID`, not `serial`. More portable, no fights with sequences.
- `TIMESTAMPTZ` always, never `TIMESTAMP`. Avoids timezone drama.
- `gen_random_uuid()` is built-in in PostgreSQL 13+. PG 16 has it natively.
- PG enums are rigid for adding values. If they're expected to change, consider `VARCHAR` with `CHECK`. Here values are closed, so enum is fine.
