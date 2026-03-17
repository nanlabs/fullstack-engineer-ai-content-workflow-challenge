# Content Workflow

This workflow combines AI draft generation with manual review and live updates.

## Campaign creation and generation

```mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant Backend
  participant AI
  participant DB
  participant Redis
  participant WS as WebSocket Gateway

  User->>Frontend: Create campaign (topic, provider, model, locales)
  Frontend->>Backend: POST /campaigns
  Backend->>DB: Save campaign + pieces/localizations
  Backend->>Redis: publish content:processing
  Redis->>WS: event fanout
  WS->>Frontend: content:processing
  Backend->>AI: Generate localized suggestions
  AI-->>Backend: title/body suggestions
  Backend->>DB: Save generated content + AI_SUGGESTED
  Backend->>Redis: publish content:suggested + status:change
  Redis->>WS: event fanout
  WS->>Frontend: content:suggested + status:change
```

## Review lifecycle

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> AI_SUGGESTED
  AI_SUGGESTED --> REVIEWED
  AI_SUGGESTED --> REJECTED
  REVIEWED --> APPROVED
  REVIEWED --> REJECTED
  APPROVED --> [*]
  REJECTED --> [*]
```

Notes:

- Editing content in non-final states sets status to `REVIEWED`.
- Final states (`APPROVED`, `REJECTED`) block further content edits.
- Every significant transition emits real-time events for connected clients.

## Realtime events used

- `campaign:join`
- `content:processing`
- `content:suggested`
- `content:update`
- `status:change`
