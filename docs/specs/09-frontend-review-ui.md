# Spec 09 — Review UI (Human-in-the-Loop)

## Goal

The page where the human actually reviews, edits, approves, rejects, or regenerates the drafts produced by the AI. It's the densest UX page and the most visible during a demo.

## Out of scope

- User auth (mock).
- Comments or collaborative discussions.

## Page: `/content-pieces/:id`

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Spring Sale 2026 / Hero banner main (headline)                     │
│                                                                      │
│ Source brief: "New spring collection launch with bold colors..."    │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Workflow status: ⚡ Awaiting review · iteration 1                │ │
│ │ Started: 2 minutes ago · Model: claude-3-5-sonnet                │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Tabs: [ EN (source) ] [ ES ] [ PT-BR ] [ FR ]                        │
│ ─────                                                                │
│                                                                      │
│ Draft (suggested by AI · 12 words · positive · keywords: spring...)  │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Spring Awakening: Bold New Colors to Light Up Your Style         │ │
│ │                                                                  │ │
│ │ [Edit inline with rich textarea]                                 │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Metadata: tone=aspirational · sentiment=positive · keywords: ...     │
│                                                                      │
│ Actions:                                                             │
│   [ ✅ Approve ]  [ ❌ Reject ]  [ 🔄 Regenerate ]  [ 💾 Save edits ]│
│                                                                      │
│ ───────                                                              │
│ Diff vs original (when edited)                                       │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ - Spring Awakening: Bold New Colors to Light Up Your Style       │ │
│ │ + Spring Awakening: Vibrant Colors to Brighten Your Style        │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Drafts history: [ v1 (current) ] [ v0 (rejected, 1m ago) ]           │
└──────────────────────────────────────────────────────────────────────┘
```

## Components

`src/features/drafts/`:

```
drafts/
├── draft-tabs.tsx              # tabs per language
├── draft-editor.tsx            # textarea with auto-save of "edited_content"
├── draft-actions.tsx           # 4 action buttons
├── draft-diff-view.tsx         # diff between ai_content and edited_content
├── draft-metadata-panel.tsx    # sentiment, keywords, tone, costs
├── draft-history-list.tsx      # previous versions
├── token-stream-panel.tsx      # visual streaming during generation
└── workflow-status-banner.tsx  # top banner with status
```

## Behaviors

### Tabs per language

One tab per workflow language (source + targets). Each tab shows:
- The "most recent" draft (the latest created for that language).
- Its editable content.
- Its metadata.

The tab badge shows the state: 🟡 suggested · 🔵 reviewed · ✅ approved · ❌ rejected.

### Inline editing

`DraftEditor` is a textarea (or RichTextEditor if you have time) showing current content:
- If the draft has `edited_content`, show that.
- Otherwise, show `ai_content`.
- Track `dirty` state: if the user types, mark as modified.
- **Save edits** button sends `PATCH /api/drafts/{id}/review` with `action=edit`.

```ts
const editor = useDraftEditor(draft);
// editor.value, editor.isDirty, editor.save(), editor.reset()
```

### Actions

| Button | Action | Calls |
|--------|--------|-------|
| ✅ Approve | confirms this draft as is (with or without edits) | `POST /workflows/:id/resume {action:"approve", draft_id}` |
| ❌ Reject | discards this draft, no replacement | `POST /workflows/:id/resume {action:"reject", draft_id, notes}` |
| 🔄 Regenerate | asks the LLM for a new version based on feedback | `POST /workflows/:id/resume {action:"regenerate", draft_id, notes}` |
| 💾 Save edits | persist human edit (workflow can continue) | `PATCH /api/drafts/{id}/review {action:"edit", edited_content}` |

Reject and Regenerate open a dialog asking for `notes` (textarea).

### Confirmation modals

Approve and Reject don't ask for confirmation (are they reversible?). Decision: YES, ask for inline confirmation ("Approve this draft?") with shadcn `AlertDialog`. More professional.

Reject + Regenerate require mandatory notes.

### Diff view

`DraftDiffView` uses `react-diff-viewer-continued`:

```tsx
<ReactDiffViewer
  oldValue={draft.ai_content}
  newValue={editor.value}
  splitView={false}
  hideLineNumbers
  showDiffOnly={false}
  styles={{ /* shadcn-aware */ }}
/>
```

Only shown if `editor.isDirty || draft.edited_content`. If the draft is unedited, it doesn't appear.

### Metadata panel

Side or below the editor:

```
┌──────────────────────────────────────────┐
│ AI metadata                              │
│   Sentiment: 🟢 positive                 │
│   Tone: aspirational                     │
│   Keywords: spring, colors, style, bold  │
│   Reading time: 4 seconds                │
│                                          │
│ Generation                               │
│   Model: claude-3-5-sonnet               │
│   Tokens: 245 in / 18 out                │
│   Cost: $0.0009                          │
│   Latency: 1.4s                          │
│                                          │
│ Lineage                                  │
│   Iteration 1                            │
│   Parent: v0 (rejected)                  │
└──────────────────────────────────────────┘
```

This shows that you **measure** what the LLM does. Differentiator.

### Visual token streaming

When a workflow is active and the frontend receives `workflow.tokens` events for this page, show a special panel:

```
┌──────────────────────────────────────────────┐
│ ⏳ Generating... (translate to fr)           │
│                                              │
│ Spring Awakening: Couleurs Audacieuses       │
│ pour Illumin█                                │
└──────────────────────────────────────────────┘
```

Implementation:
```tsx
function TokenStreamPanel({ activeNode }: { activeNode: string | null }) {
  const [streamedText, setStreamedText] = useState("");

  useEventStream(`/api/workflows/${threadId}/events`, (event) => {
    if (event.type === "workflow.tokens") {
      setStreamedText((prev) => prev + event.payload.delta);
    }
    if (event.type === "workflow.node.completed") {
      setStreamedText("");  // clear when node done
    }
  });

  if (!activeNode) return null;

  return (
    <Card>
      <CardHeader>⏳ Generating ({activeNode})</CardHeader>
      <CardContent>
        <p className="font-mono whitespace-pre-wrap">
          {streamedText}<span className="animate-pulse">█</span>
        </p>
      </CardContent>
    </Card>
  );
}
```

### Drafts history

If there are drafts with `parent_draft_id`, show the lineage. Click on an older version to display read-only.

Component: `DraftHistoryList`. A dropdown or side list.

## Page states

```
┌─ Loading initial: skeleton of the whole page
├─ Workflow not started: large CTA "Generate with AI"
├─ Workflow running:
│    └─ Banner "⏳ Generating..." + token streaming panel
├─ Workflow awaiting_human:
│    └─ Tabs + editor + actions enabled
├─ Workflow completed:
│    └─ Read-only view of final drafts with badges
└─ Workflow failed:
     └─ Error banner with CTA "Retry"
```

## Acceptance criteria

- [x] I can navigate to `/content-pieces/:id` and see the generated draft.
- [x] I can switch tabs and see the draft per language.
- [x] I can edit the text and see the diff appear.
- [x] I can approve a draft → badge updates and disappears from "pending".
- [x] I can reject a draft with notes.
- [x] I can regenerate with feedback and see the new draft appear (no F5).
- [x] While the LLM is regenerating, I see the tokens streaming.
- [x] The metadata panel shows all fields from the draft's JSONB.
- [x] Tests pass.

## Tests

`src/features/drafts/draft-actions.test.tsx`:
- Click approve → calls the mutation with correct args.
- Reject without notes → button disabled or visual validation.

`src/features/drafts/draft-editor.test.tsx`:
- Typing changes value, isDirty becomes true.
- Save calls mutation.

`src/features/drafts/draft-diff-view.test.tsx`:
- Renders diff correctly when there are changes.

## Suggested commit plan

```
feat(web): content piece detail page skeleton with tabs
feat(web): draft editor with dirty state tracking
feat(web): draft actions (approve, reject, regenerate, save)
feat(web): regenerate dialog with notes
feat(web): draft diff view with react-diff-viewer
feat(web): metadata panel with cost and lineage
feat(web): token streaming panel for live generation
feat(web): drafts history navigation
feat(web): workflow status banner with iteration counter
test(web): draft actions and editor behavior
```

## Visual differentiators worth shipping

1. **Token streaming**. The fastest way to land the wow factor.
2. **Inline diff view**. Almost nobody else will do it, and it's trivial with the lib.
3. **Cost badge** on each draft. Shows production mindset.
4. **Lineage (parent_draft_id)** visualized as a mini-tree. Demonstrates traceability awareness.
5. **Structured metadata** rendered with semantic badges instead of raw JSON.

## Implementation deviations (2026-04-29)

- **`DraftTabs` renders `<TabsList>` only** (no `<TabsContent>`). The page renders draft content directly below the tabs, not through Radix's show/hide mechanism. This keeps the page state machine simple and avoids mounting all language trees simultaneously.
- **`source_language` added to `ContentPieceDetail`** — backend schema and frontend types updated. `get_content_piece` now joins the campaign relationship to populate it. The spec assumed this was already available but it was missing from the API response.
- **`TokenStreamPanel` owns its SSE connection** — per the spec's code example. The page also connects to the same SSE URL for query invalidation; both connections work independently via per-subscriber queues on the backend.
- **Metadata panel shows only `sentiment`, `tone`, `keywords`** — the backend stores only these three fields in the draft's JSONB. `tokens`, `cost`, and `latency` are logged to structlog but not persisted in the DB; they are not shown (no fabricated values).
- **Approve includes `edited_content` when dirty** — when the user has unsaved edits and clicks Approve, `edited_content` is sent in the `ResumeRequest` body. This satisfies "confirms this draft as is (with or without edits)".
- **No ADR created** — this is a pure frontend spec with one minor backend addition (`source_language` field). The decision is documented in CLAUDE.md under Spec 09.

## Notes

- `react-diff-viewer-continued` ships light styles by default. To match shadcn (which can be in dark mode), pass `styles` or use `useTheme` to invert.
- To prevent the textarea from jumping size, set `min-h-[120px] resize-y`.
- If the draft is long, inline diff becomes impractical. Leave it for short MVP texts (headlines, ctas). For a long "body", it still helps.
- Token streaming can cause re-renders every few ms. Memoize the panel so it doesn't impact editor performance:
  ```tsx
  const TokenStreamPanel = memo(...);
  ```
- To show costs/tokens, parse the `metadata` JSONB on the backend with a Pydantic model if you want type safety on the frontend. If time is tight, receive it as `Record<string, unknown>` and cast.
