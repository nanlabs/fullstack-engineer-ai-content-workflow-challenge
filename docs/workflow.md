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

When any status change occurs, the backend emits a `content.statusChanged` event via EventEmitter2. The SSE controller picks this up and pushes it to all connected clients, so the dashboard and other views stay in sync.
