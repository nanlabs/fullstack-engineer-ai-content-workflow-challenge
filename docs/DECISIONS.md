# Tech Decisions, Assumptions & AI Design Choices

## 1. Tech Stack Summary

| Layer        | Choice        | Rationale |
|-------------|---------------|-----------|
| Backend     | **FastAPI**   | Async-native, automatic OpenAPI docs, type safety with Pydantic. Fits AI calls (async) and quick iteration. |
| API         | **REST only** | CRUD maps naturally to campaigns/contents; no need for flexible query shapes. Simpler to document and consume from React. GraphQL would add value for very dynamic UIs or many optional fields—not required here. |
| Frontend    | **React + Vite** | Fast dev experience, standard React tooling, easy build for Docker. |
| Database    | **PostgreSQL** | Relational model fits campaigns → content pieces and review states. ACID and constraints (e.g. FK) support workflow consistency. |
| AI          | **OpenAI SDK** | Required by the challenge; integration is isolated in a dedicated module for easy swap or multi-provider later. |

---

## 2. Data Model & Workflow

### Entities

- **Campaign**: Container for a marketing initiative. Has many **ContentPiece**s.
- **ContentPiece**: One unit of content (headline, description, etc.) per locale. Tracks:
  - `original_text`: Human-written or source text.
  - `ai_suggested_text`: Output from “Generate draft” or “Translate”.
  - `final_text`: Text after human review (approved as-is or edited).
  - `review_state`: Current step in the workflow.

### Review State Machine

```
DRAFT → SUGGESTED_BY_AI → REVIEWED → APPROVED
                          ↘ REJECTED
```

- **draft**: Content created, no AI suggestion yet.
- **suggested_by_ai**: AI has produced a suggestion; waiting for human review.
- **reviewed**: Human has looked at it (optional explicit step; can go straight to approved/rejected).
- **approved**: Human accepted (optionally after editing); `final_text` is the approved copy.
- **rejected**: Human rejected the suggestion; can trigger a new draft later.

Assumption: We do not enforce strict transitions in the API (e.g. no “can’t approve from draft”) so the UI can remain flexible and we can tighten rules later if needed.

---

## 3. AI Integration: Design Choices & Tradeoffs

### Modularity

- **Single module** (`backend/src/ai.py`): All AI calls go through functions like `generate_draft()` and `translate_content()`. The rest of the app does not import OpenAI directly.
- **Tradeoff**: A full `ai/` package with providers (OpenAI, Anthropic) and tasks would scale better for multiple models; for one provider and two flows (draft, translate), a single module keeps the codebase small and still allows a later split.

### Stub when no API key

- If `OPENAI_API_KEY` is missing, the AI module returns a stub string instead of calling the API.
- **Reason**: Local and CI runs can exercise the full stack without keys; production must set the key.

### Draft generation

- **Input**: Content type, locale, optional original text, optional tone/language hints.
- **Prompt**: System prompt defines the role (marketing copywriter) and optional tone/language; user prompt describes the content type and source text.
- **Output**: Plain text; stored in `ai_suggested_text` and state set to `suggested_by_ai`.
- **Tradeoff**: We do not persist full prompt/response history in the DB; that could be added for auditing or replay.

### Translation / localization

- **Input**: Content piece ID, target locale (and optional source text override).
- **Output**: Translated text; stored in `ai_suggested_text` and state set to `suggested_by_ai` so the same human-in-the-loop flow applies (review → approve/reject).
- **Assumption**: “Translation” is treated as another AI suggestion, not a separate workflow state, to keep one review pipeline.

### Model and parameters

- Model is configurable via `OPENAI_MODEL` (default `gpt-4o-mini`).
- Temperature fixed at 0.7 for drafts/translations to balance creativity and consistency. Could be made configurable per request later.

---

## 4. Human-in-the-Loop UX

- **Generate draft / Translate**: User triggers AI; result appears as “AI suggestion”.
- **Approve**: User accepts the suggestion (as-is or after edit); `final_text` is set and state → `approved`.
- **Edit then approve**: User can edit the suggested text in the UI; on “Save” we update `ai_suggested_text` (or a dedicated “edited” field); on “Approve”, we set `final_text` to that value and state → `approved`.
- **Reject**: User explicitly rejects; state → `rejected`. No overwrite of `final_text`; user can trigger a new draft later.

Assumption: We do not store a full edit history (only the current suggestion and final approved text); that could be added with an `revisions` or `audit_log` table.

---

## 5. Real-Time Updates

- **Current approach**: Frontend polls the campaigns list on an interval (e.g. every 10s) when the tab is visible, so multiple users see updates without manual refresh.
- **Tradeoff**: Polling is simpler than WebSockets/SSE and sufficient for a “see updates in near real-time” requirement. For true real-time (e.g. live cursors, instant notifications), we would add SSE or WebSockets and optionally Redis for pub/sub.

---

## 6. Assumptions Summary

- One review pipeline for both “draft” and “translation” suggestions.
- No strict state-machine validation in the API (flexible transitions).
- No audit log or version history for content yet.
- Real-time is “periodic refresh” unless we add SSE/WS.
- OpenAI-only for the initial delivery; Anthropic/LangChain can be added behind the same `ai` module interface.
