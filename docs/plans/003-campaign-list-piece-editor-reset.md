# Campaign List + Piece Editor Flow Reset

## Summary

Realign the product around a simpler 3-step flow taken from Stitch:

1. `Dashboard` shows only a simple list of campaigns.
2. Entering a campaign opens `Campaign Content List v2`, where the user sees that campaign’s content pieces with workflow tags.
3. Clicking a content piece opens `Content Piece Editor v2`, where the user can improve canonical text, generate AI drafts, translate on demand, and extract metadata.

This corrects the current drift:
- creating a content piece must not require translation setup
- translation is an action on an existing piece
- the campaign page is primarily a content list, not an editor-first screen

## Key Changes

### Product flow

- `/` becomes a simple campaign index using the existing Stitch shell, but without the current hero/banner emphasis.
- `/campaigns/[campaignId]` becomes the `Campaign Content List v2` screen:
  - show campaign header
  - show compact list/cards of content pieces
  - each piece shows status tag: `draft`, `ai_suggested`, `in_review`, `approved`, `rejected`
  - creation is a lightweight action from this screen, not a full editorial form
- `/campaigns/[campaignId]/content-pieces/[pieceId]` becomes the `Content Piece Editor v2` screen:
  - canonical/base text is the main content area
  - AI draft generation, translation, metadata extraction, and review actions live here
  - entering the editor happens by clicking the row/card in the content list

### Content creation model

- New content piece creation is reduced to `text only` in the UI.
- `type` is removed from V1 user-facing scope.
- Backend stores a fixed internal default type such as `"content"` for all newly created pieces.
- `source_language` is no longer required at creation time.
- `target_language` is never part of creation time.
- `current_text` still initializes from the submitted base text.

### Translation model

- Translation becomes an explicit editor action on a selected content piece.
- Clicking `Traducir` opens a modal with:
  - current content reference
  - `from` language selector
  - `to` language selector
- Translation is independent from creation and independent from whether the piece already has an AI draft.
- The modal acts on the selected piece’s canonical text.
- Backend translation request requires `source_language` and `target_language` at action time.

### Campaign content list screen

- Replace the current campaign page layout that combines summary, creation, queue, and review editor.
- Use a list-first screen based on `Campaign Content List v2`:
  - top summary
  - list of pieces with state tags and preview text
  - compact `Nueva pieza` action
  - no inline translation fields
  - no review editor embedded in the same screen
- The main action on each piece is entering the editor by clicking the item.

### Content piece editor screen

- Base this screen on `Content Piece Editor v2`.
- Editor flows:
  - edit canonical text
  - generate AI draft
  - review latest AI suggestion
  - approve / edit-and-approve / reject
  - translate via modal
  - extract metadata
- Keep `latest_reviewable_suggestion` and `latest_metadata` separate.
- Canonical text remains the primary editable source of truth.
- Metadata remains auxiliary and never becomes the approval target.

### Backend and interface changes

- `POST /campaigns/:id/content-pieces`
  - public request accepts only base text, plus optional canonical text if needed
  - backend fills internal default `type="content"`
  - no language fields required
- `ContentPieceResponse`
  - keeps `review_state`
  - keeps `latest_reviewable_suggestion`
  - keeps `latest_metadata`
  - `source_language` and `target_language` become nullable stored state
- `POST /content-pieces/:id/ai/translate`
  - requires `source_language`
  - requires `target_language`
  - may keep `context`
- DB/model changes
  - make `source_language` nullable
  - keep `target_language` nullable
  - keep `type` internally, but remove it from V1 UX
- Routing changes
  - keep `/`
  - keep `/campaigns/[campaignId]`
  - add `/campaigns/[campaignId]/content-pieces/[pieceId]`

## Test Plan

### Backend

- Create content piece with only base text.
- Created content piece starts in `draft`.
- Draft generation works without language fields.
- Translation fails if `source_language` or `target_language` is missing.
- Translation succeeds when both are provided at action time.
- Metadata extraction still works from canonical text.
- Review flows still behave correctly:
  - accept
  - edit and approve
  - reject

### Frontend

- Dashboard lists campaigns and routes into the selected campaign.
- Campaign content list shows all pieces with status tags and preview text.
- Creating a piece from the campaign list does not ask for translation fields.
- Clicking a content piece routes into the dedicated editor page.
- Editor supports:
  - canonical text editing
  - AI draft generation
  - translation via modal
  - metadata extraction
  - review actions
- SSE refresh still updates list/editor state correctly.

### Manual scenarios

- Create campaign.
- Add several pieces with only base text.
- Confirm pieces appear immediately in the campaign content list with `draft`.
- Open one piece, edit canonical text, generate draft, approve it.
- Open another piece, translate it through the modal.
- Extract metadata from a piece after draft generation.
- Return to the campaign list and verify statuses reflect the updated workflow.

## Assumptions and Defaults

- `Campaign Content List v2` is the source of truth for the campaign screen.
- `Content Piece Editor v2` is the source of truth for the editor screen.
- Dashboard remains visually aligned with the Stitch shell, but functionally simplified to a campaign list.
- `type` stays only as an internal backend default for now and is removed from V1 UX.
- Translation uses canonical text as the source in this reset.
- Language is chosen at translation time by the user in the modal; there is no automatic detection in this pass.
