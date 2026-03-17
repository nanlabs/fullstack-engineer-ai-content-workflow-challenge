# Campaign Generation Workflow

The system generates AI campaigns through an asynchronous workflow.

Steps:

1. User creates a campaign
2. Backend creates campaign record
3. Campaign pieces are created
4. Localizations are generated
5. AI providers generate content
6. Progress is streamed via WebSocket
7. Campaign completes
8. User receives notification and can edit content

# Diagram workflow

User enters topic
      ↓
Create Campaign
      ↓
Create Content Pieces
      ↓
Generate Localizations
      ↓
AI Generation
      ↓
Store Results
      ↓
Campaign Completed
      ↓
User Reviews Content