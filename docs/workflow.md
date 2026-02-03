# Review Workflow

## State Machine
The content review lifecycle follows:

- `DRAFT`
- `AI_SUGGESTED`
- `IN_REVIEW`
- `APPROVED` / `REJECTED`

## Transitions
- **Generate AI**: `DRAFT` → `AI_SUGGESTED`
- **Start Review**: `AI_SUGGESTED` → `IN_REVIEW`
- **Approve**: `IN_REVIEW` → `APPROVED`
- **Reject**: `IN_REVIEW` → `REJECTED`
- **Edit**: `IN_REVIEW` → `APPROVED` (with edited text)

## Notes
Transitions are emitted over WebSockets to keep clients in sync.
