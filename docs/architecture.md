# Architecture & Design Decisions

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose                           │
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌───────────────┐   │
│  │   Next.js    │────▶│   NestJS     │────▶│  PostgreSQL   │   │
│  │  :3000       │     │  :4000       │     │  :5432        │   │
│  │  (Frontend)  │◀────│  (Backend)   │     │               │   │
│  └──────────────┘     └──────────────┘     └───────────────┘   │
│        │  WebSocket (Socket.io)   │                             │
│        └──────────────────────────┘                             │
│                            │                                    │
│                   ┌────────┴────────┐                          │
│                   │                 │                           │
│              ┌────▼────┐     ┌─────▼───┐                       │
│              │Anthropic │     │  OpenAI │                       │
│              │  Claude  │     │  GPT-4o │                       │
│              └──────────┘     └─────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model & State Machine

### Content Status Flow

```
  ┌───────┐   AI generates   ┌──────────────┐
  │ DRAFT │─────────────────▶│ AI_SUGGESTED │
  └───────┘                  └──────────────┘
                                     │
                               Human reviews
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  UNDER_REVIEW    │
                            └──────────────────┘
                                     │
                         ┌───────────┴───────────┐
                         ▼                       ▼
                   ┌──────────┐          ┌──────────┐
                   │ APPROVED │          │ REJECTED │
                   └──────────┘          └──────────┘
```

### Entity Relationships

```
Campaign (1) ──────── (N) ContentPiece
                              │
                    ┌─────────┴──────────┐
                    │                    │
                (N) AIDraft          (N) Translation
```

## Tech Decisions & Tradeoffs

### API: REST (not GraphQL)

Chose **REST** for this project because:

- The data access patterns are straightforward and predictable (CRUD + state transitions)
- REST is universally understood and easier to document
- No need for flexible querying from the client side
- Simpler caching strategy with HTTP methods

If the product evolved to support complex nested queries (e.g., "give me all approved content for campaigns tagged X, with only Claude-generated drafts"), **GraphQL would make more sense** at that point.

### Backend: NestJS + Fastify

- **NestJS** provides a robust module system, dependency injection, and great TypeScript support — exactly what you need for a growing application
- **Fastify** over Express: better performance (~2x throughput), built-in schema validation
- **Prisma** over TypeORM: cleaner API, better type inference from schema, automatic migrations

### Real-time: Socket.io WebSockets

Chose **WebSockets via Socket.io** over SSE (Server-Sent Events) because:
- Bidirectional communication is available if needed in the future
- Better browser support and reconnection handling out of the box
- Socket.io's room feature can be leveraged to scope events per campaign

### Frontend: Next.js 14 App Router

- App Router gives us easy layout nesting and co-located loading/error UI
- `output: 'standalone'` for lightweight Docker image
- No state management library needed — local state + direct API calls keeps it simple

### AI Integration Design

The `AiService` is deliberately provider-agnostic:

```typescript
async generateDraft(contentPieceId, model, customPrompt?) {
  const text = model === 'CLAUDE_3_5_SONNET'
    ? await this.callClaude(...)
    : await this.callOpenAI(...);
  // ... persist and emit
}
```

Benefits:
- Easy to add new providers (Gemini, Mistral) without touching controllers
- The "compare models" feature (`compareModels()`) runs both in parallel and returns structured results for side-by-side comparison
- Structured JSON output from both providers ensures consistent metadata (keywords, tone, sentiment)

### Structured AI Outputs

Both Claude and GPT-4o are prompted to respond in JSON:

```json
{
  "generatedText": "...",
  "keywords": ["..."],
  "tone": "professional",
  "sentiment": "positive"
}
```

This metadata is stored and surfaced in the UI to help reviewers make faster decisions.

## Tradeoffs & Known Limitations

| Area | Decision | Tradeoff |
|------|----------|----------|
| Auth | No authentication | Simplicity over security; production would need JWT or OAuth |
| Queue | Synchronous AI calls | Simple but blocks the request; Kafka/BullMQ would be better at scale |
| Caching | No Redis cache | Adds complexity; useful for expensive AI calls in production |
| Testing | E2E tests only | Unit tests for AiService mocks would improve confidence in AI logic |
| Translations | Stored per-content | Could normalize language storage into its own table for campaigns |
