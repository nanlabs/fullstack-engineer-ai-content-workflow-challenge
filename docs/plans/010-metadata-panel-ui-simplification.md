# Metadata Panel UI Simplification Plan

## Summary

This pass is UI-only. The goal is to make the extracted metadata panel more compact and readable without changing backend contracts, schema, prompts, or frontend types.

## Changes

1. Hide `campaign_theme` from the metadata panel only.
2. Compact the metadata panel header and reduce vertical spacing.
3. Reorganize visible fields into a tighter editorial summary:
   - `Tone`
   - `Sentiment`
   - `Audience`
   - `Goal`
   - `Channel Fit`
   - `CTA Strength`
   - `Keywords`
4. Use smaller chips and denser summary cards to reduce panel height.
5. Keep `Pending` and `Failed` states, but make them visually lighter.

## Files

- `frontend/components/content-review-panel.tsx`
- `frontend/app/globals.css`

## Non-Goals

- No backend changes
- No API changes
- No type changes
- No prompt changes
- No metadata schema changes

## Validation

- Metadata still renders when present.
- `campaign_theme` remains in payloads/types but is not shown.
- `Pending` and `Failed` states remain visible.
- `lab=1` behavior remains unchanged.
