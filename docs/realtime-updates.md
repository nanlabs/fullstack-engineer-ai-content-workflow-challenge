# Real-Time Workflow Updates

Campaign generation can take several seconds or minutes.

To provide better user feedback, the system uses WebSockets to stream progress updates.

Examples of events:

campaign.started
piece.generating
piece.completed
localization.generating
campaign.completed

This allows the frontend to display real-time progress.