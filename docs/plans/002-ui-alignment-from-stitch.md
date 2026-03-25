# UI Alignment Plan From Stitch

## Summary

Use the Stitch project `Generate content ACME Media` as the structural reference for the next UI iteration.

This pass keeps the challenge inside V1 scope:
- improve workflow clarity
- separate reviewable AI text from metadata
- align dashboard and workbench structure with the Stitch project
- document out-of-scope Stitch screens as backlog only

## Implement Now

- `Dashboard de Campañas Pro`
- `Campaign Genesis`
- `Editorial Workbench (Creative Focused)`
- `Editorial Workbench (Engineering Aligned)`
- `Mesa de Trabajo Editorial Pro`

## Backlog Only

- `Dashboard Global - ACME Media`
- `Historial de Versiones - ACME Media`
- `Editorial Workbench (Master View)`

## Required Product Changes

- show campaign workflow counts by review state
- expose a latest reviewable suggestion separately from metadata
- restructure dashboard around campaign status
- replace flat content-piece stacks with a queue plus selected workbench
- separate source text, canonical text, AI suggestion, and metadata
- organize AI and review actions by workflow stage
- make review editing start from the latest reviewable suggestion

## Constraints

- keep REST and SSE
- do not add auth
- do not add version history features in V1
- treat Stitch as a workflow/layout reference, not a pixel-perfect spec
