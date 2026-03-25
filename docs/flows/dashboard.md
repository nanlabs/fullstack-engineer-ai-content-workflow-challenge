# Dashboard Flow

## Goal

The dashboard is the operational home for campaign supervision.

## Primary actions

- Review campaign status at a glance
- Open a campaign workbench
- Start a new campaign from `Nueva Campaña`
- Scan AI optimization guidance

## Routing

- `Nueva Campaña` -> `/campaigns/new`
- campaign card primary action -> `/campaigns/{campaignId}`

## UX rules

- the dashboard uses the Stitch shell with sidebar and top bar
- campaign cards show status, counts, progress, and a clear CTA
- the AI banner is informational and can later route to recommendation views

## Backlog note

- global supervision beyond the current campaign list remains out of scope for this screen
