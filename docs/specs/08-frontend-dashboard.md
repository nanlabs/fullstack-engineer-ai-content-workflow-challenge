# Spec 08 — Campaigns Dashboard

## Goal

Pages that allow: viewing the list of campaigns, creating a new one, viewing the detail with its content pieces, creating/editing content pieces, and triggering AI generation from the UI.

## Out of scope

- Drafts review UI, diff and approval (spec 09).
- Visual token streaming (spec 09).

## Pages

### `/campaigns` — List

```
┌──────────────────────────────────────────────────────────────┐
│  Header: "ACME GLOBAL MEDIA · Content Workflow"             │
├──────────────────────────────────────────────────────────────┤
│ [Sidebar: campaign list + New]    │ Main:                    │
│                                    │                          │
│   • Spring Sale 2026               │  Campaigns               │
│   • Q1 Launch                      │  ──────────              │
│   • [+ New Campaign]               │  ┌─────────────────────┐│
│                                    │  │ Spring Sale 2026    ││
│                                    │  │ 3 content pieces    ││
│                                    │  │ EN ES PT-BR FR      ││
│                                    │  │ Updated 2h ago      ││
│                                    │  └─────────────────────┘│
│                                    │  ┌─────────────────────┐│
│                                    │  │ Q1 Launch           ││
│                                    │  │ ...                 ││
│                                    │  └─────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

Components:
- `CampaignCard`: shows name, truncated brief, content piece count, language badges, date.
- `CampaignFormDialog`: modal with form to create/edit.
- Empty state if no campaigns.

### `/campaigns/:id` — Campaign detail

```
┌──────────────────────────────────────────────────────────────┐
│  ← Campaigns                                                  │
│                                                               │
│  Spring Sale 2026                              [Edit] [Delete]│
│  Brief: New spring collection launch...                      │
│  Languages: EN → ES, PT-BR, FR                               │
│                                                               │
│  Content pieces                              [+ New piece]   │
│  ────────────────                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Headline · "Hero banner main"                           │ │
│  │ Status: ⚡ Awaiting review (4 drafts)                  │ │
│  │ [Review] [Regenerate]                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Description · "Product page short copy"                │ │
│  │ Status: 📝 Draft (no AI runs yet)                      │ │
│  │ [Generate with AI]                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Components:
- `ContentPieceRow`: shows type, title, status badge, draft count, contextual action.
- Status badge depends on the aggregate state of the associated drafts:
  - No drafts → "📝 Draft" → button **Generate with AI**.
  - Workflow `running` → "⏳ Generating..." (with spinner) → no action.
  - Workflow `awaiting_human` → "⚡ Awaiting review (N drafts)" → button **Review**.
  - All drafts terminal → "✅ Completed" or "❌ Rejected" → button **Regenerate**.

### `/content-pieces/:id` — Detail (drafts)

This page is implemented in spec 09 (review). Here we just leave the routing ready and a placeholder.

## New components

`src/features/campaigns/`:

```
campaigns/
├── campaign-card.tsx
├── campaign-form-dialog.tsx
├── campaigns-list.tsx
├── campaign-header.tsx
└── delete-campaign-confirm.tsx
```

`src/features/content-pieces/`:

```
content-pieces/
├── content-piece-row.tsx
├── content-piece-form-dialog.tsx
├── content-pieces-list.tsx
├── content-piece-status-badge.tsx
└── generate-button.tsx
```

## Key behaviors

### Create campaign

`CampaignFormDialog` with fields:
- Name (text, required)
- Brief (textarea)
- Source language (select: en, es, pt-BR, fr, de, it)
- Target languages (multi-select chips)

Validation with `zod` + `react-hook-form`:

```ts
const schema = z.object({
  name: z.string().min(1).max(200),
  brief: z.string().optional(),
  source_language: z.string(),
  target_languages: z.array(z.string()).min(1),
});
```

Submit → `useCreateCampaign().mutate(...)` → close modal → toast → navigate to `/campaigns/{id}`.

### Create content piece

Inside campaign detail, button **+ New piece** opens `ContentPieceFormDialog`:
- Type (select: headline, description, cta, body)
- Title (text)
- Source text (textarea, optional — "any extra context for the AI")

Submit → `useCreateContentPiece().mutate({campaignId, ...})` → close modal → invalidate detail query.

### Trigger generation

Click on **Generate with AI** calls:

```ts
const start = useStartWorkflow();
start.mutate({ contentPieceId }, {
  onSuccess: ({ thread_id }) => {
    setActiveThreadId(thread_id);
    // navigate to review page when ready
  }
});
```

While running, `ContentPieceRow` shows a spinner.

### Real-time updates

In `CampaignDetailPage`:

```tsx
const { data: campaign } = useCampaign(id);

useEventStream(`/api/campaigns/${id}/events`, (event) => {
  switch (event.type) {
    case "workflow.started":
    case "workflow.node.started":
    case "workflow.node.completed":
    case "workflow.completed":
    case "workflow.failed":
    case "workflow.awaiting_human":
    case "draft.updated":
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: contentPieceKeys.byCampaign(id) });
      break;
  }
});
```

Result: open two tabs and what happens in one is reflected in the other.

### Generation-in-progress indicator

`ContentPieceRow` shows an animated badge while the workflow is running. Ideally with the current node as a hint:

```
⏳ Generating... (translating to fr)
```

How: `useWorkflow(threadId)` query that refreshes when `workflow.node.started` arrives.

## Empty states

- No campaigns: illustration + "Create your first campaign" + button.
- Campaign without content pieces: instructive card "Add content pieces to start generating drafts with AI".
- Content piece without drafts and never generated: state `📝 Draft` + Generate button.

## Loading states

- List loading → 3 `<Skeleton />` of card height.
- Detail loading → header skeleton + skeleton row list.
- Mutations → disabled button + inline spinner.

## Error states

- If the API returns an error, show `ApiError.message` with a toast.
- If a page fails to load, show error component with "Retry" button.

## Tests

`src/features/campaigns/campaign-card.test.tsx`:
- Renders name, truncated brief, count, languages.

`src/features/content-pieces/content-piece-status-badge.test.tsx`:
- Maps states to labels and colors correctly.

`src/pages/campaigns-list.test.tsx`:
- With MSW mocking `/api/campaigns`, render list.
- Click "New" opens modal.
- Submit creates and appears in list (mock invalidate flow).

Test focus: few but significant. Don't test trivial buttons.

## Acceptance criteria

- [x] I can create a campaign from the UI with all fields.
- [x] The campaign appears in the list and sidebar immediately.
- [x] Clicking a campaign navigates to detail with its content pieces.
- [x] I can create a content piece inside a campaign.
- [x] Clicking "Generate with AI" triggers the workflow and I see the badge change to "Generating..."
- [x] When the workflow reaches awaiting_human, the badge changes to "Awaiting review" without a refresh.
- [x] If I open the same campaign in two tabs, both update in real time.
- [x] Tests pass.

## Suggested commit plan

```
feat(web): campaigns list page with skeleton and empty state
feat(web): campaign form dialog with zod validation
feat(web): campaign detail page with header and content pieces list
feat(web): content piece form dialog
feat(web): content piece status badge with state mapping
feat(web): generate button triggering workflow start
feat(web): real-time invalidation via SSE in campaign detail
feat(web): generating indicator showing current node
test(web): campaign card and status badge
test(web): campaigns list page integration with msw
```

## Trade-offs

- **Cardview vs tableview in campaigns list:** card. More space for contextual info, better mobile UX (although mobile is not critical).
- **Multi-select of languages:** chips/badges over dropdown. More visual.
- **Polling as SSE fallback:** NOT implemented in MVP. If SSE drops, the user has to refresh. Document as limitation.

## Implementation notes (actual deviations from spec)

### Backend changes (not originally in scope but required)

`ContentPieceSummary` was extended with three new fields to support the frontend status badge:
- `workflow_status: WorkflowStatus | None` — live workflow run state
- `latest_thread_id: str | None` — thread ID for `useWorkflow` queries
- `drafts_count: int` — total draft count for the "Awaiting review (N drafts)" label

`campaign_service.get_campaign` updated to load `ContentPiece.workflow_run` via `selectinload` alongside drafts.

### Multi-select for target languages

Hand-rolled with Badge chips + inline toggle buttons (option 1). Unselected languages appear as `+ Language` clickable buttons; selected ones show as Badge chips with an × remove button.

### SSE connection state → Header wiring

Implemented via `SseContext` + `SseProvider` in `AppShell`. `CampaignDetailPage` calls `setConnected(true/false)` via the context; `AppShell` reads `connected` and passes it to `Header`. This is cleaner than React Router outlet context since `Header` is a sibling, not a descendant, of the outlet.

### `useEventStream` return value

Updated to return `{ connected: boolean }` by adding `useState` and `es.onopen` / `es.onerror` handlers. Backward-compatible — existing callers that ignore the return value continue to work.

### `frontend/.npmrc` added

`node-linker=hoisted` required on this Windows dev machine because pnpm's default virtual store uses junction points that Node.js v22 cannot traverse. The hoisted layout creates a flat `node_modules` tree. CI (Linux) is unaffected.

### NODE_LABELS mapping (implemented)

```ts
const NODE_LABELS = {
  generate_draft: "Generating draft",
  extract_metadata: "Analyzing content",
  translate_to_language: "Translating",
  refine: "Refining based on feedback",
};
```

### Sidebar

`CreateCampaignDialog` (spec-07 stub) replaced by `CampaignFormDialog` (spec-08 full implementation). The old file was deleted.

### `contentPieceKeys.byCampaign` / workflow invalidation

`byCampaign` key added and invalidated on SSE events. `workflowKeys.detail(threadId)` also invalidated on `workflow.node.started` and `workflow.node.completed` to refresh `current_node` in `ContentPieceRow`.

- If the campaign list grows, the sidebar can saturate. Don't optimize in MVP, just allow scroll and note in "Future improvements".
