# API Examples — AI Content Workflow

> cURL examples for every endpoint. Base URL: `http://localhost:3000/api/v1`
>
> 💡 **Tip:** Interactive API documentation is available at [http://localhost:3000/api/docs](http://localhost:3000/api/docs) when the app is running.

---

## Table of Contents

- [Campaigns](#campaigns)
- [Content Pieces](#content-pieces)
- [AI Generation](#ai-generation)
- [Drafts](#drafts)
- [Review Workflow](#review-workflow)
- [Error Responses](#error-responses)

---

## Campaigns

### Create a Campaign

```bash
curl -X POST http://localhost:3000/api/v1/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer 2026 Product Launch",
    "description": "Global launch campaign for eco-friendly products targeting EU and LATAM markets.",
    "targetLanguages": ["es", "fr", "de", "pt"],
    "sourceLanguage": "en"
  }'
```

**Response** `201 Created`:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Summer 2026 Product Launch",
  "description": "Global launch campaign for eco-friendly products targeting EU and LATAM markets.",
  "status": "active",
  "targetLanguages": ["es", "fr", "de", "pt"],
  "sourceLanguage": "en",
  "createdAt": "2026-04-16T12:00:00.000Z",
  "updatedAt": "2026-04-16T12:00:00.000Z"
}
```

### List All Campaigns

```bash
# Basic listing
curl http://localhost:3000/api/v1/campaigns

# With pagination and filtering
curl "http://localhost:3000/api/v1/campaigns?page=1&limit=10&status=active&search=summer"
```

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "name": "Summer 2026 Product Launch",
      "status": "active",
      "targetLanguages": ["es", "fr", "de", "pt"],
      "sourceLanguage": "en",
      "createdAt": "2026-04-16T12:00:00.000Z",
      "updatedAt": "2026-04-16T12:00:00.000Z",
      "_count": { "contentPieces": 3 }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### Get Campaign with Content Pieces

```bash
curl http://localhost:3000/api/v1/campaigns/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response** `200 OK`:
```json
{
  "id": "a1b2c3d4-...",
  "name": "Summer 2026 Product Launch",
  "status": "active",
  "targetLanguages": ["es", "fr", "de", "pt"],
  "sourceLanguage": "en",
  "contentPieces": [
    {
      "id": "b2c3d4e5-...",
      "type": "headline",
      "originalText": "Introducing our eco-friendly product line",
      "language": "en",
      "metadata": null,
      "aiDrafts": [
        {
          "id": "c3d4e5f6-...",
          "reviewState": "ai_suggested",
          "provider": "openai"
        }
      ]
    }
  ],
  "createdAt": "2026-04-16T12:00:00.000Z",
  "updatedAt": "2026-04-16T12:00:00.000Z"
}
```

### Update a Campaign

```bash
curl -X PATCH http://localhost:3000/api/v1/campaigns/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paused",
    "targetLanguages": ["es", "fr", "de", "pt", "ja"]
  }'
```

### Archive (Soft-Delete) a Campaign

```bash
curl -X DELETE http://localhost:3000/api/v1/campaigns/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

## Content Pieces

### Create a Content Piece

```bash
curl -X POST http://localhost:3000/api/v1/campaigns/a1b2c3d4-e5f6-7890-abcd-ef1234567890/content \
  -H "Content-Type: application/json" \
  -d '{
    "type": "headline",
    "originalText": "Introducing our new eco-friendly product line",
    "language": "en"
  }'
```

**Response** `201 Created`:
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "campaignId": "a1b2c3d4-...",
  "type": "headline",
  "originalText": "Introducing our new eco-friendly product line",
  "language": "en",
  "metadata": null,
  "createdAt": "2026-04-16T12:05:00.000Z",
  "updatedAt": "2026-04-16T12:05:00.000Z"
}
```

Content types: `headline`, `description`, `body`, `cta`, `tagline`

### List Content Pieces for a Campaign

```bash
curl http://localhost:3000/api/v1/campaigns/a1b2c3d4-e5f6-7890-abcd-ef1234567890/content
```

### Get a Content Piece with Drafts

```bash
curl http://localhost:3000/api/v1/content/b2c3d4e5-f6a7-8901-bcde-f12345678901
```

### Update a Content Piece

```bash
curl -X PATCH http://localhost:3000/api/v1/content/b2c3d4e5-f6a7-8901-bcde-f12345678901 \
  -H "Content-Type: application/json" \
  -d '{
    "originalText": "Discover our revolutionary eco-friendly product line"
  }'
```

### Delete a Content Piece

```bash
curl -X DELETE http://localhost:3000/api/v1/content/b2c3d4e5-f6a7-8901-bcde-f12345678901
```

---

## AI Generation

### Generate a Draft (Single Provider)

```bash
curl -X POST http://localhost:3000/api/v1/content/b2c3d4e5-f6a7-8901-bcde-f12345678901/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "tone": "professional",
    "style": "concise"
  }'
```

**Response** `201 Created`:
```json
[
  {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "contentPieceId": "b2c3d4e5-...",
    "provider": "openai",
    "model": "gpt-4o",
    "taskType": "generation",
    "targetLanguage": null,
    "generatedText": "Embrace sustainability without compromise. Our new eco-friendly product line combines cutting-edge innovation with environmental responsibility.",
    "metadata": null,
    "reviewState": "ai_suggested",
    "reviewerNotes": null,
    "editedText": null,
    "createdAt": "2026-04-16T12:10:00.000Z",
    "updatedAt": "2026-04-16T12:10:00.000Z"
  }
]
```

### Generate Drafts (Both Providers — Comparison Mode)

```bash
curl -X POST http://localhost:3000/api/v1/content/b2c3d4e5-f6a7-8901-bcde-f12345678901/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "both"
  }'
```

Returns an array of 2 drafts (one from OpenAI, one from Anthropic) for side-by-side comparison.

### Translate Content

```bash
curl -X POST http://localhost:3000/api/v1/content/b2c3d4e5-f6a7-8901-bcde-f12345678901/translate \
  -H "Content-Type: application/json" \
  -d '{
    "targetLanguages": ["es", "fr", "de"],
    "provider": "openai"
  }'
```

**Response** `201 Created`:
```json
[
  {
    "id": "d4e5f6a7-...",
    "taskType": "translation",
    "targetLanguage": "es",
    "generatedText": "Adopta la sostenibilidad sin compromisos...",
    "reviewState": "ai_suggested"
  },
  {
    "id": "e5f6a7b8-...",
    "taskType": "translation",
    "targetLanguage": "fr",
    "generatedText": "Adoptez la durabilité sans compromis...",
    "reviewState": "ai_suggested"
  },
  {
    "id": "f6a7b8c9-...",
    "taskType": "translation",
    "targetLanguage": "de",
    "generatedText": "Setzen Sie auf Nachhaltigkeit ohne Kompromisse...",
    "reviewState": "ai_suggested"
  }
]
```

### Extract Metadata

```bash
curl -X POST http://localhost:3000/api/v1/content/b2c3d4e5-f6a7-8901-bcde-f12345678901/extract \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai"
  }'
```

**Response** `200 OK`:
```json
{
  "keywords": ["eco-friendly", "sustainability", "innovation", "product launch"],
  "tone": "professional",
  "sentiment": 0.85,
  "summary": "Marketing headline promoting a new environmentally conscious product line."
}
```

### Run Full Pipeline (Generate → Translate → Extract)

```bash
curl -X POST http://localhost:3000/api/v1/content/b2c3d4e5-f6a7-8901-bcde-f12345678901/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai"
  }'
```

**Response** `201 Created`:
```json
{
  "generation": {
    "id": "c3d4e5f6-...",
    "generatedText": "Embrace sustainability without compromise...",
    "provider": "openai",
    "reviewState": "ai_suggested"
  },
  "translations": [
    { "id": "d4e5f6a7-...", "targetLanguage": "es", "generatedText": "..." },
    { "id": "e5f6a7b8-...", "targetLanguage": "fr", "generatedText": "..." }
  ],
  "metadata": {
    "keywords": ["eco-friendly", "sustainability"],
    "tone": "professional",
    "sentiment": 0.85,
    "summary": "..."
  }
}
```

---

## Drafts

### List All Drafts for a Content Piece

```bash
curl http://localhost:3000/api/v1/content/b2c3d4e5-f6a7-8901-bcde-f12345678901/drafts
```

### Get a Single Draft

```bash
curl http://localhost:3000/api/v1/drafts/c3d4e5f6-a7b8-9012-cdef-123456789012
```

---

## Review Workflow

The review follows this state machine: `draft` → `ai_suggested` → `reviewed` → `approved` / `rejected` → (reset to `draft`)

### Mark as Reviewed

Transitions from `ai_suggested` → `reviewed`.

```bash
curl -X PATCH http://localhost:3000/api/v1/drafts/c3d4e5f6-a7b8-9012-cdef-123456789012/review
```

### Approve a Draft

Transitions from `reviewed` → `approved`. Optionally include human-edited text.

```bash
curl -X PATCH http://localhost:3000/api/v1/drafts/c3d4e5f6-a7b8-9012-cdef-123456789012/approve \
  -H "Content-Type: application/json" \
  -d '{
    "editedText": "Embrace sustainability. Our revolutionary eco-friendly line is here."
  }'
```

### Reject a Draft

Transitions from `reviewed` → `rejected`. Optionally include reviewer feedback.

```bash
curl -X PATCH http://localhost:3000/api/v1/drafts/c3d4e5f6-a7b8-9012-cdef-123456789012/reject \
  -H "Content-Type: application/json" \
  -d '{
    "reviewerNotes": "Tone is too formal. We need something more casual and energetic for this campaign."
  }'
```

### Reset a Rejected Draft

Transitions from `rejected` → `draft`, clearing reviewer notes and edits. Ready for regeneration.

```bash
curl -X PATCH http://localhost:3000/api/v1/drafts/c3d4e5f6-a7b8-9012-cdef-123456789012/reset
```

### Bulk Approve Multiple Drafts

Approve multiple drafts in a single request. Each is validated independently — partial success is possible.

```bash
curl -X POST http://localhost:3000/api/v1/drafts/bulk-approve \
  -H "Content-Type: application/json" \
  -d '{
    "draftIds": [
      "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "d4e5f6a7-b8c9-0123-defa-234567890123",
      "e5f6a7b8-c9d0-1234-efab-345678901234"
    ]
  }'
```

**Response** `201 Created`:
```json
[
  {
    "draftId": "c3d4e5f6-...",
    "success": true,
    "data": { "id": "c3d4e5f6-...", "reviewState": "approved" }
  },
  {
    "draftId": "d4e5f6a7-...",
    "success": true,
    "data": { "id": "d4e5f6a7-...", "reviewState": "approved" }
  },
  {
    "draftId": "e5f6a7b8-...",
    "success": false,
    "error": "Invalid transition from \"ai_suggested\" to \"approved\""
  }
]
```

---

## Error Responses

### 400 Bad Request — Validation Error

```json
{
  "statusCode": 400,
  "message": ["name must be a string", "name should not be empty"],
  "error": "Bad Request"
}
```

### 400 Bad Request — AI Provider Not Configured

```json
{
  "statusCode": 400,
  "message": "Provider \"anthropic\" is not configured. Set the API key in environment variables.",
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Content piece with id \"nonexistent-uuid\" not found",
  "error": "Not Found"
}
```

### 409 Conflict — Invalid State Transition

```json
{
  "statusCode": 409,
  "message": "Invalid transition from \"ai_suggested\" to \"approved\". Must be in \"reviewed\" state.",
  "error": "Conflict"
}
```

---

## WebSocket Events

Connect to the WebSocket server and join a campaign room to receive real-time events:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { transports: ['websocket'] });

// Join a campaign room
socket.emit('join:campaign', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

// Listen for events
socket.on('draft:created', (data) => {
  console.log('New draft:', data.draftId, data.provider);
});

socket.on('draft:updated', (data) => {
  console.log('Draft state changed:', data.draftId, data.reviewState);
});

socket.on('campaign:updated', (data) => {
  console.log('Campaign changed:', data.campaignId);
});

// Leave room when done
socket.emit('leave:campaign', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');
```
