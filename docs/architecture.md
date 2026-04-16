# Architecture — AI Content Workflow

> Detailed architecture documentation with diagrams for the ACME Content Workflow system.

---

## System Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        UI["Campaign Dashboard<br/>Content Editor<br/>Review Panel"]
        RC["REST Client<br/>(fetch)"]
        WC["WebSocket Client<br/>(socket.io-client)"]
        RQ["TanStack React Query<br/>(cache + invalidation)"]
    end

    subgraph Backend["Backend (NestJS)"]
        API["REST API<br/>/api/v1/*"]
        WG["WebSocket Gateway<br/>(Socket.IO)"]
        
        subgraph Modules["Feature Modules"]
            CM["Campaigns<br/>Module"]
            CO["Content<br/>Module"]
            DR["Drafts<br/>Module"]
            AI["AI<br/>Module"]
            RV["Review<br/>Module"]
        end

        subgraph AILayer["AI Layer"]
            LC["LangChain Chains"]
            OP["OpenAI Provider<br/>(ChatOpenAI)"]
            AP["Anthropic Provider<br/>(ChatAnthropic)"]
        end
    end

    subgraph Infrastructure
        PG["PostgreSQL 16"]
        RD["Redis 7"]
        OAI["OpenAI API<br/>(GPT-4o)"]
        ANT["Anthropic API<br/>(Claude)"]
    end

    UI --> RC
    UI --> WC
    RC --> RQ
    RC -->|HTTP| API
    WC -->|WebSocket| WG

    API --> CM
    API --> CO
    API --> DR
    API --> AI
    API --> RV

    AI --> LC
    LC --> OP
    LC --> AP
    OP -->|SDK| OAI
    AP -->|SDK| ANT

    CM -->|Prisma| PG
    CO -->|Prisma| PG
    DR -->|Prisma| PG
    RV -->|Prisma| PG
    AI -->|Prisma| PG

    RV -->|publish| RD
    AI -->|publish| RD
    RD -->|subscribe| WG
    WG -->|push events| WC
```

---

## Module Dependency Graph

```mermaid
graph LR
    App["AppModule"] --> Config["ConfigModule<br/>(global)"]
    App --> Prisma["PrismaModule<br/>(global)"]
    App --> Redis["RedisModule"]
    App --> WS["WebSocketModule"]
    App --> Camp["CampaignsModule"]
    App --> Cont["ContentModule"]
    App --> Draft["DraftsModule"]
    App --> AIM["AiModule"]
    App --> Rev["ReviewModule"]

    Camp -->|uses| Prisma
    Cont -->|uses| Prisma
    Draft -->|uses| Prisma
    AIM -->|uses| Prisma
    Rev -->|uses| Prisma

    WS -->|uses| Redis
    Rev -->|emits via| WS
    AIM -->|emits via| WS

    AIM -->|OpenAI| OP["OpenAiProvider"]
    AIM -->|Anthropic| AP["AnthropicProvider"]
    AIM -->|chains| LC["LangChain"]
    
    style Prisma fill:#3b82f6,color:#fff
    style Redis fill:#dc2626,color:#fff
    style WS fill:#8b5cf6,color:#fff
```

| Module | Responsibility | Dependencies |
|---|---|---|
| `PrismaModule` | Database client, connection management | PostgreSQL |
| `RedisModule` | Shared Redis client, pub/sub helpers | Redis |
| `WebSocketModule` | Socket.IO gateway, room management, event broadcasting | RedisModule |
| `CampaignsModule` | CRUD for campaigns, pagination, filtering | PrismaModule |
| `ContentModule` | CRUD for content pieces within campaigns | PrismaModule |
| `DraftsModule` | Query AI drafts by content piece | PrismaModule |
| `AiModule` | AI generation, translation, extraction via LangChain | PrismaModule, OpenAI, Anthropic |
| `ReviewModule` | Review workflow state machine, transition validation | PrismaModule, WebSocketModule |

---

## Data Flow Diagrams

### AI Content Generation Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as NestJS API
    participant AI as AiService
    participant LC as LangChain
    participant LLM as OpenAI / Anthropic
    participant DB as PostgreSQL
    participant Redis
    participant WS as WebSocket Gateway

    User->>FE: Click "Generate Draft"
    FE->>API: POST /api/v1/content/:id/generate
    API->>AI: generate(contentId, provider)
    AI->>DB: Fetch ContentPiece + Campaign
    DB-->>AI: Content + campaign context
    AI->>LC: Build generation chain
    LC->>LLM: Invoke with prompt
    LLM-->>LC: Generated text
    LC-->>AI: Parsed output
    AI->>DB: Create AiDraft (state: ai_suggested)
    DB-->>AI: Created draft
    AI->>Redis: Publish draft:created event
    Redis->>WS: Forward event
    WS->>FE: Push draft:created to campaign room
    API-->>FE: Return draft(s)
    FE->>FE: Invalidate React Query cache
    FE-->>User: Show new draft
```

### Review Workflow Flow

```mermaid
sequenceDiagram
    actor Reviewer
    participant FE as Frontend
    participant API as NestJS API
    participant RV as ReviewService
    participant SM as State Machine
    participant DB as PostgreSQL
    participant WS as WebSocket Gateway

    Reviewer->>FE: Click "Mark Reviewed"
    FE->>API: PATCH /api/v1/drafts/:id/review
    API->>RV: markReviewed(draftId)
    RV->>DB: Fetch draft
    RV->>SM: assertTransition(ai_suggested → reviewed)
    SM-->>RV: Valid ✓
    RV->>DB: Update reviewState
    RV->>WS: Emit draft:updated
    API-->>FE: Return updated draft

    Reviewer->>FE: Edit text + Click "Approve"
    FE->>API: PATCH /api/v1/drafts/:id/approve
    API->>RV: approve(draftId, editedText)
    RV->>SM: assertTransition(reviewed → approved)
    SM-->>RV: Valid ✓
    RV->>DB: Update state + editedText
    RV->>WS: Emit draft:updated
    API-->>FE: Return approved draft
```

### Multi-Provider Comparison Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant AI as AiService
    participant OAI as OpenAI (GPT-4o)
    participant ANT as Anthropic (Claude)
    participant DB as PostgreSQL

    User->>FE: Select "Both" provider
    FE->>AI: generate(contentId, "both")
    
    par Parallel Generation
        AI->>OAI: Generate content
        OAI-->>AI: OpenAI result
    and
        AI->>ANT: Generate content
        ANT-->>AI: Anthropic result
    end

    AI->>DB: Save OpenAI draft
    AI->>DB: Save Anthropic draft
    AI-->>FE: Return both drafts
    FE-->>User: Show side-by-side comparison
```

---

## Database Schema (ERD)

```mermaid
erDiagram
    Campaign ||--o{ ContentPiece : "has many"
    ContentPiece ||--o{ AiDraft : "has many"

    Campaign {
        uuid id PK
        varchar name
        text description
        enum status "active | paused | completed | archived"
        text[] targetLanguages
        varchar sourceLanguage "default: en"
        timestamp createdAt
        timestamp updatedAt
    }

    ContentPiece {
        uuid id PK
        uuid campaignId FK
        enum type "headline | description | body | cta | tagline"
        text originalText
        varchar language "default: en"
        jsonb metadata "keywords, tone, sentiment"
        timestamp createdAt
        timestamp updatedAt
    }

    AiDraft {
        uuid id PK
        uuid contentPieceId FK
        enum provider "openai | anthropic"
        varchar model "e.g. gpt-4o, claude-sonnet-4-20250514"
        enum taskType "generation | translation | extraction | summarization"
        varchar targetLanguage "nullable, for translations"
        text generatedText
        jsonb metadata "extraction results"
        enum reviewState "draft | ai_suggested | reviewed | approved | rejected"
        text reviewerNotes "nullable"
        text editedText "nullable, human edits"
        timestamp createdAt
        timestamp updatedAt
    }
```

---

## Review State Machine

```mermaid
stateDiagram-v2
    [*] --> draft: AI module creates record

    draft --> ai_suggested: AI generates content
    ai_suggested --> reviewed: Human opens & reviews
    reviewed --> approved: Human approves
    reviewed --> rejected: Human rejects
    rejected --> draft: Reset for regeneration

    approved --> [*]
    
    note right of draft
        Initial state.
        Waiting for AI generation.
    end note

    note right of ai_suggested
        AI has generated content.
        Awaiting human review.
    end note

    note right of reviewed
        Human has seen the content.
        Can approve or reject.
    end note

    note left of approved
        Final state.
        Content accepted (with optional edits).
    end note

    note left of rejected
        Content rejected with notes.
        Can be reset to draft for regeneration.
    end note
```

### Valid Transitions

| From | To | Trigger | HTTP Endpoint |
|---|---|---|---|
| `draft` | `ai_suggested` | AI generates content | `POST /content/:id/generate` |
| `ai_suggested` | `reviewed` | Human opens and reviews | `PATCH /drafts/:id/review` |
| `reviewed` | `approved` | Human approves (optional edits) | `PATCH /drafts/:id/approve` |
| `reviewed` | `rejected` | Human rejects (optional notes) | `PATCH /drafts/:id/reject` |
| `rejected` | `draft` | Reset for regeneration | `PATCH /drafts/:id/reset` |

Any invalid transition returns a **409 Conflict** response.

---

## Real-Time Event Architecture

```mermaid
graph LR
    subgraph Backend Services
        RS["ReviewService"]
        AS["AiService"]
        CS["CampaignsService"]
    end

    subgraph Event Bus
        RD["Redis Pub/Sub<br/>Channel: ws:events"]
    end

    subgraph WebSocket Layer
        GW["EventsGateway<br/>(Socket.IO)"]
        R1["Room: campaign:uuid-1"]
        R2["Room: campaign:uuid-2"]
    end

    subgraph Clients
        C1["Browser Tab 1"]
        C2["Browser Tab 2"]
        C3["Browser Tab 3"]
    end

    RS -->|publish| RD
    AS -->|publish| RD
    CS -->|publish| RD

    RD -->|subscribe| GW
    GW --> R1
    GW --> R2

    R1 -->|push| C1
    R1 -->|push| C2
    R2 -->|push| C3

    style RD fill:#dc2626,color:#fff
    style GW fill:#8b5cf6,color:#fff
```

### Event Types

| Event | Payload | Trigger |
|---|---|---|
| `draft:created` | `{ draftId, contentPieceId, campaignId, provider }` | AI generates a new draft |
| `draft:updated` | `{ draftId, reviewState, updatedAt }` | Review state changes |
| `campaign:updated` | `{ campaignId, field, value }` | Campaign details modified |
| `content:updated` | `{ contentPieceId, campaignId }` | Content piece modified |

Clients join rooms by `campaignId` on navigation and leave when navigating away. The frontend `useRealtimeUpdates` hook automatically invalidates relevant React Query caches when events arrive, ensuring the UI stays in sync without manual refreshes.
