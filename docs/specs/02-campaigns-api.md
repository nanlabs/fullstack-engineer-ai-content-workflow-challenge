# Spec 02 — Campaigns & Content Pieces API

## Goal

Expose REST endpoints for CRUD on campaigns and content pieces. This is the "boring" layer of the project but it has to be flawless: consistent shapes, clear errors, robust validation, end-to-end typing.

## Out of scope

- AI generation (spec 03+).
- Workflow resume (spec 05).
- SSE (spec 06).

## Endpoints

### Campaigns

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/campaigns` | Create campaign |
| `GET` | `/api/campaigns` | List campaigns (with simple pagination) |
| `GET` | `/api/campaigns/{id}` | Campaign detail with its content pieces |
| `PATCH` | `/api/campaigns/{id}` | Update editable fields |
| `DELETE` | `/api/campaigns/{id}` | Delete (cascade to content pieces and drafts) |

### Content Pieces

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/campaigns/{campaign_id}/content-pieces` | Create content piece under campaign |
| `GET` | `/api/content-pieces/{id}` | Detail with drafts (latest per language) |
| `PATCH` | `/api/content-pieces/{id}` | Edit `source_text`, `title` |
| `DELETE` | `/api/content-pieces/{id}` | Delete |

### Drafts (read + review only in this spec)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/content-pieces/{id}/drafts` | List drafts (all languages, all versions) |
| `GET` | `/api/drafts/{id}` | Detail of a draft |
| `PATCH` | `/api/drafts/{id}/review` | Change status (approve/reject/edit) |

> ⚠️ Draft generation (POST) is NOT here. It's in spec 04 (workflow). Here we only manage drafts that already exist.

## Schemas (Pydantic v2)

`backend/src/api/schemas/`:

```
schemas/
├── __init__.py
├── campaign.py
├── content_piece.py
├── draft.py
└── common.py        # PaginatedResponse, ErrorResponse
```

### Common

```python
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int
```

### Campaign

```python
class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    brief: str | None = None
    target_languages: list[str] = Field(default_factory=list, max_length=10)
    source_language: str = "en"

    @field_validator("target_languages")
    @classmethod
    def validate_languages(cls, v):
        # ISO 639-1 or simple BCP-47 (en, es, pt-BR)
        for lang in v:
            if not re.match(r"^[a-z]{2}(-[A-Z]{2})?$", lang):
                raise ValueError(f"Invalid language code: {lang}")
        return v


class CampaignUpdate(BaseModel):
    name: str | None = None
    brief: str | None = None
    target_languages: list[str] | None = None


class CampaignRead(BaseModel):
    id: UUID
    name: str
    brief: str | None
    target_languages: list[str]
    source_language: str
    created_at: datetime
    updated_at: datetime
    content_pieces_count: int = 0  # computed


class CampaignDetail(CampaignRead):
    content_pieces: list["ContentPieceSummary"]
```

### Content Piece

```python
class ContentPieceCreate(BaseModel):
    type: ContentPieceType  # enum
    title: str | None = None
    source_text: str | None = None


class ContentPieceUpdate(BaseModel):
    title: str | None = None
    source_text: str | None = None


class ContentPieceSummary(BaseModel):
    id: UUID
    type: ContentPieceType
    title: str | None
    has_drafts: bool
    latest_status: DraftStatus | None  # status of the most recent draft


class ContentPieceDetail(ContentPieceSummary):
    campaign_id: UUID
    source_text: str | None
    drafts: list["DraftRead"]
    created_at: datetime
    updated_at: datetime
```

### Draft

```python
class DraftRead(BaseModel):
    id: UUID
    content_piece_id: UUID
    language: str
    status: DraftStatus
    ai_content: str | None
    edited_content: str | None
    final_content: str | None  # computed: edited_content or ai_content
    model_used: str | None
    provider: str | None
    metadata: dict[str, Any] | None
    parent_draft_id: UUID | None
    reviewed_by: str | None
    reviewed_at: datetime | None
    review_notes: str | None
    created_at: datetime


class DraftReviewAction(BaseModel):
    action: Literal["approve", "reject", "edit"]
    edited_content: str | None = None
    review_notes: str | None = None

    @model_validator(mode="after")
    def validate_action(self):
        if self.action == "edit" and not self.edited_content:
            raise ValueError("edited_content is required when action is 'edit'")
        return self
```

## Router structure

`backend/src/api/`:

```
api/
├── __init__.py
├── schemas/
├── deps.py                # get_session, get_current_user (mock)
├── errors.py              # custom exceptions + handlers
├── routers/
│   ├── __init__.py
│   ├── campaigns.py
│   ├── content_pieces.py
│   └── drafts.py
└── pagination.py          # parse limit/offset query params
```

Wiring in `main.py`:

```python
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(content_pieces.router, prefix="/api", tags=["content-pieces"])
app.include_router(drafts.router, prefix="/api", tags=["drafts"])
```

## Services

`backend/src/services/`:

```
services/
├── __init__.py
├── campaign_service.py
├── content_piece_service.py
└── draft_service.py
```

**Rule:** routers do NOT write SQL. They call services. Services receive `session: AsyncSession` via DI. This is what enables testing services without standing up HTTP.

## Error handling

### Domain exceptions

`backend/src/api/errors.py`:

```python
class DomainError(Exception):
    code: str
    status_code: int = 400


class NotFoundError(DomainError):
    code = "NOT_FOUND"
    status_code = 404


class ValidationError(DomainError):
    code = "VALIDATION_ERROR"
    status_code = 422


class ConflictError(DomainError):
    code = "CONFLICT"
    status_code = 409
```

### Global handlers

```python
@app.exception_handler(DomainError)
async def domain_error_handler(request, exc: DomainError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": str(exc)}}
    )

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "VALIDATION_ERROR", "message": "Invalid request", "details": exc.errors()}}
    )
```

### Error codes used

| Code | HTTP | When |
|------|------|------|
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Invalid body |
| `CONFLICT` | 409 | Inconsistent state |
| `INTERNAL_ERROR` | 500 | Unexpected |

## Specific behaviors

### `POST /api/campaigns`

- Body: `CampaignCreate`.
- Validates `source_language` is in a plausible list (keep it simple: validate format, not the full ISO list).
- Creates and returns `CampaignRead` with 201.

### `GET /api/campaigns`

- Query params: `limit` (default 20, max 100), `offset` (default 0), `q` (search in `name`, optional).
- Returns `PaginatedResponse[CampaignRead]`.
- Sorted by `created_at DESC`.

### `GET /api/campaigns/{id}`

- Returns `CampaignDetail` with `content_pieces` (summaries).
- 404 if not found.

### `PATCH /api/content-pieces/{id}` and similar

- Only updates fields present in the body (do not nullify what wasn't sent).
- Returns the updated resource.

### `PATCH /api/drafts/{id}/review`

Logic:

```python
match action:
    case "approve":
        # previous status must be 'suggested' or 'reviewed'
        draft.status = DraftStatus.APPROVED
        draft.reviewed_at = now()
        draft.reviewed_by = "reviewer@acme.com"
    case "reject":
        # idem
        draft.status = DraftStatus.REJECTED
        draft.review_notes = body.review_notes
    case "edit":
        # allowed from any non-final status (not approved/rejected)
        draft.edited_content = body.edited_content
        draft.status = DraftStatus.REVIEWED
```

Validate invalid transitions:
- Cannot approve a draft already `rejected`.
- Cannot reject a draft already `approved`.
- → `ConflictError` with a clear message.

After making the change, **publish an event** to the pub/sub for SSE (see spec 06). In this spec, leave a TODO comment: `# TODO(spec 06): publish event`.

## Tests

Layout `tests/api/`:

```
tests/
├── conftest.py             # DB fixtures + async client
├── api/
│   ├── test_campaigns.py
│   ├── test_content_pieces.py
│   └── test_drafts.py
└── services/
    └── test_draft_service.py
```

`conftest.py` provides:
- `db_session` fixture with rollback at the end
- `client` fixture (httpx.AsyncClient with the app)
- `seeded_campaign` fixture

Minimum test cases:

**campaigns**
- `test_create_campaign_returns_201`
- `test_create_campaign_validation_error_on_empty_name`
- `test_list_campaigns_pagination`
- `test_get_campaign_404`
- `test_update_campaign_partial`
- `test_delete_campaign_cascades_content_pieces`

**content_pieces**
- `test_create_content_piece_under_campaign`
- `test_create_content_piece_invalid_campaign_404`
- `test_get_content_piece_includes_drafts`

**drafts**
- `test_review_approve_transitions_status`
- `test_review_edit_requires_edited_content`
- `test_review_approve_rejected_draft_returns_409`

## Acceptance criteria

- [ ] Auto-generated OpenAPI at `/docs` shows all endpoints with correct schemas.
- [ ] All tests pass.
- [ ] `curl -X POST http://localhost:8000/api/campaigns -d '{"name":"Test"}' -H "Content-Type: application/json"` returns 201 with a UUID.
- [ ] Errors always have shape `{"error": {"code", "message"}}`.
- [ ] Lint passes.

## Suggested commit plan

```
feat(api): pydantic schemas for campaign and content_piece
feat(api): error handlers and domain exceptions
feat(api): campaigns crud router and service
test(api): campaigns crud test suite
feat(api): content_pieces crud nested under campaigns
test(api): content_pieces test suite
feat(api): drafts read endpoints and review action
test(api): draft review state transitions
```

## Notes

- Do NOT abuse FastAPI `response_model` with lazy relationships — it hangs. For `CampaignDetail` with content_pieces, use explicit `selectinload`.
- For `/docs` to expose useful info, set `title`, `description`, `version` in `FastAPI(...)`.
- For tests with `httpx.AsyncClient`, use `transport=ASGITransport(app=app)` (httpx 0.28+).
- No auth in this spec. If you want a mock user for `reviewed_by`, hardcode it. Document as conscious decision in README.
