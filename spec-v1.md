# AI Content Workflow – Build Spec

## 1. Overview

This project implements a full-stack application for managing AI-assisted campaign content creation and review. Users can create campaigns, manage content pieces, generate AI-powered suggestions for draft generation and translation, extract basic content metadata, and move content through a human-in-the-loop review workflow. The system persists workflow state in PostgreSQL and exposes real-time updates to connected clients.

## 2. Scope

### In Scope

- Create campaigns
- Create and manage content pieces inside campaigns
- Generate AI draft suggestions
- Generate translation/localization suggestions
- Extract metadata such as keywords, tone, and sentiment
- Review, edit, approve, or reject AI suggestions
- Persist review workflow state
- Broadcast content updates in real time

### Out of Scope

- Authentication and authorization
- Advanced version history
- Background job queues and distributed workers
- Multi-user conflict resolution
- Fine-grained permissions
- Complex analytics dashboards

## 3. Domain Model

### Campaign

Represents a marketing campaign that groups multiple content pieces.

Fields:

- id
- name
- description
- created_at
- updated_at

### ContentPiece

Represents an editable unit of campaign content.

Fields:

- id
- campaign_id
- type
- source_text
- current_text
- source_language
- target_language
- review_state
- created_at
- updated_at

### AISuggestion

Represents an AI-generated output associated with a content piece.

Fields:

- id
- content_piece_id
- provider
- model
- operation_type
- input_text
- output_text
- structured_output_json
- status
- created_at

### ReviewAction

Represents a human decision on a content piece or AI suggestion.

Fields:

- id
- content_piece_id
- ai_suggestion_id
- action
- comment
- edited_text
- created_at

## 4. Workflow State Model

### States

- draft
- ai_suggested
- in_review
- approved
- rejected

### Transition Rules

- A newly created content piece starts in `draft`
- When AI generates a suggestion, the state becomes `ai_suggested`
- When a user starts reviewing or editing content, the state becomes `in_review`
- When a user approves the final content, the state becomes `approved`
- When a user rejects the current suggestion or content, the state becomes `rejected`

### Rule

`current_text` is the canonical working text for the content piece. AI suggestions are stored separately and do not overwrite canonical content automatically.

## 5. Core User Flows

### Flow A – Create Campaign and Content

1. User creates a campaign
2. User adds one or more content pieces
3. Each content piece starts in `draft`

### Flow B – Generate AI Draft

1. User selects a content piece
2. User triggers AI draft generation
3. Backend calls the LLM provider
4. Suggestion is stored
5. Content state becomes `ai_suggested`
6. Frontend receives update in real time

### Flow C – Translate or Localize

1. User triggers translation/localization for a content piece
2. Backend generates a translated suggestion
3. Suggestion is stored
4. UI updates in real time

### Flow D – Review Content

1. User compares canonical content with AI suggestion
2. User accepts, edits, or rejects the suggestion
3. Review action is persisted
4. `current_text` updates only when a suggestion is accepted or edited
5. Final state becomes `approved` or `rejected`

## 6. API Design

### Campaigns

- POST /campaigns
- GET /campaigns
- GET /campaigns/:id

### Content Pieces

- POST /campaigns/:id/content-pieces
- GET /content-pieces/:id
- PATCH /content-pieces/:id

### AI Operations

- POST /content-pieces/:id/ai/generate-draft
- POST /content-pieces/:id/ai/translate
- POST /content-pieces/:id/ai/extract-metadata

### Review

- POST /content-pieces/:id/review

### Realtime

- GET /events

## 7. AI Design

The AI layer supports three operations:

- draft generation
- translation/localization
- metadata extraction

Design principles:

- AI calls are encapsulated in service-layer abstractions
- Prompting is task-specific and deterministic
- Structured outputs are validated before persistence
- AI failures do not mutate canonical content state
- AI-generated suggestions are always auditable and recoverable

## 8. Frontend Scope

Views:

- Campaign dashboard
- Campaign detail page
- Content review panel

Capabilities:

- create campaigns
- create content pieces
- display workflow state badges
- trigger AI operations
- compare current text with AI suggestion
- edit suggested text
- approve or reject content
- receive live updates

## 9. Realtime Strategy

The system uses Server-Sent Events (SSE) to deliver server-to-client updates for AI generation completion and workflow state transitions. SSE is sufficient for this challenge because the realtime requirements are notification-oriented and do not require full bidirectional collaboration.

## 10. Testing Strategy

### Backend

- state transition tests
- AI service tests with mocked provider
- integration tests for core API flows

### Frontend

- component tests for review actions
- optional integration coverage for the main workflow

### Manual QA

- create campaign and content
- generate AI suggestion
- approve suggestion
- reject suggestion
- edit before approval
- verify realtime updates

## 11. Tradeoffs and Decisions

- REST was chosen over GraphQL to keep the API simple and easy to reason about for a resource-oriented workflow
- PostgreSQL is sufficient because the domain is relational and does not require document storage
- Authentication was excluded to prioritize the core product workflow
- AI orchestration was intentionally kept lightweight because the workflow is deterministic
- SSE was preferred over WebSockets to reduce complexity while still supporting realtime UX
