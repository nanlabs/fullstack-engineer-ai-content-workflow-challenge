# Content Review Workflow

## Overview

The content lifecycle follows a strict state machine that ensures human oversight of all AI-generated content before it goes live.

## States

| State | Meaning |
|-------|---------|
| **DRAFT** | Initial state. Content piece created, no AI generation yet. |
| **AI_SUGGESTED** | AI has generated/updated the content. Awaiting human review. |
| **REVIEWED** | A human has looked at the content but hasn't decided yet. |
| **APPROVED** | Content is approved for use. Terminal state. |
| **REJECTED** | Content was rejected. Can be reset to DRAFT for re-generation. |

## Valid Transitions

```
DRAFT ──────────► AI_SUGGESTED
                      │
                      ├──► REVIEWED ──┬──► APPROVED
                      │               └──► REJECTED ──► DRAFT
                      ├──► APPROVED
                      └──► REJECTED ──► DRAFT
```

## Rules

1. **Only AI actions move content from DRAFT to AI_SUGGESTED** — The `/generate` and `/chain` endpoints automatically set status to `AI_SUGGESTED`.
2. **APPROVED is terminal** — Once approved, content cannot be changed. This prevents accidental modifications to live content.
3. **REJECTED resets to DRAFT** — This allows re-triggering AI generation with potentially different prompts or models.
4. **Review notes are preserved** — Status changes can include optional `reviewNotes` that persist on the content piece.

## Frontend UX

The ContentDetail page adapts its available actions based on the current status:

- **DRAFT** (no body): Shows "Generate Draft" AI button
- **DRAFT** (with body): Shows AI buttons + "Edit content" link
- **AI_SUGGESTED**: Shows Approve / Mark as Reviewed / Reject buttons
- **REVIEWED**: Shows Approve / Reject buttons
- **APPROVED**: Shows confirmation message, no actions
- **REJECTED**: Shows "Reset to Draft" button

## Real-time Updates

When any status change occurs, the backend emits a `content.statusChanged` event via EventEmitter2. The SSE controller routes events to the **specific user's connections** based on the `userId` attached to the event payload. This ensures:

- **Cross-device sync**: If a user has two browsers/devices open, both receive real-time updates when content changes.
- **User isolation**: User A's actions never trigger SSE events in User B's stream.
- **Per-connection subjects**: Each SSE connection gets its own RxJS `Subject`, mapped by userId. When a user disconnects, their Subject is cleaned up.

The frontend `useEventSource` hook passes the JWT token via query parameter (`/api/events?token=xxx`) since the browser `EventSource` API does not support custom headers. The backend verifies the token and registers the connection for the authenticated user.

## Authentication

### JWT-Based Authentication

The system uses JSON Web Tokens (JWT) for stateless authentication:

1. **Signup** (`POST /api/auth/signup`) — Creates a new user with bcrypt-hashed password (salt rounds: 10), returns a JWT token + user info.
2. **Login** (`POST /api/auth/login`) — Validates credentials against bcrypt hash, returns a JWT token + user info.
3. **Protected routes** — All campaign, content, and AI endpoints require a valid `Authorization: Bearer <token>` header. The JWT contains `{ sub: userId, email }`.
4. **Token expiration** — JWTs expire after 24h (configurable via `JWT_EXPIRATION` env var). On 401, the frontend clears the stored token and redirects to login.

### User Scoping

All data is scoped per user to ensure complete isolation:

- **Campaigns** — The `Campaign` model has a `userId` foreign key. `GET /api/campaigns` only returns campaigns belonging to the authenticated user.
- **Content pieces** — Ownership is verified through the parent campaign's `userId`. Users cannot access, modify, or trigger AI on content belonging to other users.
- **Seed data** — Running `prisma db seed` creates a demo user (`demo@acme.com` / `demo1234`) with sample campaigns.

### Password Security

- Passwords are hashed using **bcrypt** with a cost factor of 10 before storage.
- Plaintext passwords are never stored or logged.
- Login responses never include the password hash.
