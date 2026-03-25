# Workbench Review Flow

## Goal

Support the full editorial workflow for one campaign inside a Stitch-aligned workbench.

## Primary actions

- select a content piece from the queue
- create a new content piece
- generate AI draft
- translate
- extract metadata
- start review
- accept suggestion
- edit and approve
- reject

## Routing

- dashboard card -> `/campaigns/{campaignId}`
- queue selection -> `/campaigns/{campaignId}?pieceId={contentPieceId}`
- back to dashboard -> `/`

## UX rules

- the left side shows queue and piece creation
- the main panel focuses on the selected piece
- metadata is never treated as the reviewable text suggestion
- review actions operate on the latest reviewable suggestion
- SSE refresh updates the selected piece without resetting the page flow

## Backlog note

- version history and master editorial views stay outside the current implementation
