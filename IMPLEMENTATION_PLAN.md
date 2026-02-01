# AI Content Workflow - Implementation Plan

## Project Overview

Building an AI-powered content creation and review workflow system for ACME GLOBAL MEDIA. The system manages campaigns with multiple content pieces, generates AI drafts, provides translation/localization, and implements a human-in-the-loop review process with real-time updates.

**Key Principle:** Keep the project lean and focused. This is a challenge submission, so we prioritize clean architecture, working features, and clear documentation over extensive testing or over-engineering.

---

## Tech Stack

### Backend
- **Framework:** TypeScript + NestJS
- **Database:** PostgreSQL with TypeORM
- **AI Integration:** OpenAI SDK (GPT-4)
- **Real-time:** WebSockets (Socket.io)
- **API Style:** REST (simpler for this scope, easier real-time integration)

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **State Management:** React hooks + Context (keep it simple)
- **Real-time:** Socket.io client

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Database:** PostgreSQL 15

---

## Phase 1: Foundation & Architecture

### Goals
- Set up project structure
- Design database schema
- Configure Docker environment
- Establish basic API structure

### Tasks
1. **Initialize Projects**
   - Create NestJS backend with TypeScript
   - Create React + Vite frontend
   - Set up Docker Compose with PostgreSQL

2. **Database Design**
   - Design Campaign entity (id, name, description, status, targetLanguages, createdAt, updatedAt)
   - Design ContentPiece entity (id, campaignId, type, title, originalText, aiDraft, translations, reviewState, metadata, createdAt, updatedAt)
   - Design ReviewState enum: DRAFT → AI_SUGGESTED → IN_REVIEW → APPROVED/REJECTED

3. **Backend Foundation**
   - Configure TypeORM with PostgreSQL
   - Set up basic module structure (CampaignsModule, ContentModule, AIModule)
   - Configure environment variables (.env.example)

4. **Frontend Foundation**
   - Set up project structure
   - Configure Tailwind CSS
   - Create basic layout and navigation

### Testing Strategy (Minimal)
- **Skip for this phase** - Focus on getting structure right

### Deliverables
- Running Docker environment
- Database connection established
- Basic project structure in place

---

## Phase 2: Core Backend API

### Goals
- Implement all CRUD operations for campaigns and content
- Build AI integration for content generation
- Set up WebSocket for real-time updates

### Tasks
1. **Campaign Management**
   - `POST /campaigns` - Create new campaign
   - `GET /campaigns` - List all campaigns
   - `GET /campaigns/:id` - Get campaign with content pieces
   - `PATCH /campaigns/:id` - Update campaign
   - `DELETE /campaigns/:id` - Delete campaign

2. **Content Piece Management**
   - `POST /campaigns/:id/content` - Add content piece to campaign
   - `GET /content/:id` - Get single content piece
   - `PATCH /content/:id` - Update content piece
   - `DELETE /content/:id` - Delete content piece

3. **AI Integration**
   - Set up OpenAI SDK with proper error handling
   - `POST /content/:id/generate` - Generate AI draft
     - Accept prompt/context
     - Generate headline/description using GPT-4
     - Save to aiDraft field
     - Update state to AI_SUGGESTED
   - `POST /content/:id/translate` - Generate translations
     - Accept target languages
     - Generate translations using GPT-4
     - Save to translations JSON field

4. **Review Workflow**
   - `POST /content/:id/review` - Submit review decision
     - Accept action: APPROVE, REJECT, or EDIT
     - Accept editedText (optional)
     - Update review state accordingly

5. **Real-time Updates**
   - Set up Socket.io gateway
   - Emit events on:
     - Content piece created/updated/deleted
     - AI draft generated
     - Review state changed

### Testing Strategy (Minimal)
- **Unit test only the AI service** - Mock OpenAI calls, test prompt formatting
- **Skip:** Controller tests, integration tests, e2e tests

### Deliverables
- Complete REST API
- AI generation working
- Real-time updates functional

---

## Phase 3: Frontend Implementation

### Goals
- Build campaign dashboard
- Create AI generation UI
- Implement review workflow interface
- Connect real-time updates

### Tasks
1. **Dashboard & Campaign Management**
   - Campaign list page with create button
   - Campaign detail page showing all content pieces
   - Create campaign modal/form
   - Campaign status indicators

2. **Content Management UI**
   - Add content piece form (title, type, original text)
   - Content piece cards showing current state
   - Delete/edit content actions

3. **AI Generation Interface**
   - "Generate AI Draft" button on content pieces
   - Loading state during generation
   - Display AI suggestion with comparison to original
   - "Generate Translations" button with language selector

4. **Review Workflow UI**
   - Review page showing:
     - Original text
     - AI draft (editable)
     - Action buttons: Approve, Reject, Edit & Save
   - State transition visual feedback
   - History of review actions

5. **Real-time Integration**
   - Connect Socket.io client
   - Update UI when content changes
   - Show notifications for AI completion
   - Live status updates

### Testing Strategy (Minimal)
- **No tests for frontend** - Manual testing sufficient for challenge

### Deliverables
- Functional UI for all features
- Real-time updates working
- Clean, intuitive workflow

---

## Phase 4: Docker & Documentation

### Goals
- Complete Docker setup
- Write comprehensive documentation
- Create architecture diagrams
- Polish for submission

### Tasks
1. **Docker Configuration**
   - Backend Dockerfile (multi-stage build)
   - Frontend Dockerfile (multi-stage build)
   - Docker Compose with:
     - PostgreSQL service
     - Backend service
     - Frontend service
   - Environment variable configuration
   - Health checks

2. **Documentation**
   - Update main README.md:
     - Project overview
     - Setup instructions (docker-compose up)
     - Tech stack decisions and tradeoffs
     - API documentation (endpoints, request/response examples)
   - Create docs/ folder:
     - architecture.md - System design and data flow
     - workflow.md - Review state machine explanation
     - decisions.md - Why we chose each technology

3. **Code Quality**
   - Add ESLint and Prettier configuration
   - Ensure consistent code style
   - Add helpful comments where needed
   - Clean up console logs and debug code

4. **Final Polish**
   - Test entire flow end-to-end
   - Verify Docker setup works on clean environment
   - Check all features work together
   - Add .env.example with all required variables

### Testing Strategy (Minimal)
- **No additional tests** - Manual end-to-end testing only

### Deliverables
- Complete Docker setup
- Comprehensive documentation
- Clean, review-ready codebase

---

## Phase 5: Bonus Features (If Time Permits)

### Priority Order (do only if ahead of schedule)

1. **Multi-Model Support**
   - Add Anthropic SDK integration
   - Allow comparing OpenAI vs Anthropic outputs
   - Simple toggle in UI

2. **LangChain Integration**
   - Chain: generate → translate → extract keywords
   - Use LangChain for structured output parsing

3. **Enhanced AI Features**
   - Sentiment analysis endpoint
   - Keyword extraction
   - Tone analysis

4. **CI/CD**
   - GitHub Actions workflow for linting
   - Basic test runner (if we add more tests)

### Testing Strategy
- **Skip all testing for bonus features** - Focus on implementation

---

## File Structure

```
/
├── .github/
│   └── workflows/
│       └── ci.yml (optional)
├── backend/
│   ├── src/
│   │   ├── campaigns/
│   │   ├── content/
│   │   ├── ai/
│   │   ├── websocket/
│   │   ├── config/
│   │   └── main.ts
│   ├── test/
│   │   └── ai.service.spec.ts (only test file)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── docs/
│   ├── architecture.md
│   ├── workflow.md
│   └── decisions.md
├── compose.yml
├── .env.example
└── README.md
```

---

## Key Decisions & Tradeoffs

### Why REST over GraphQL?
- **Pros:** Simpler to implement, easier WebSocket integration, faster development
- **Cons:** Less flexible for complex queries, over-fetching possible
- **Decision:** REST is sufficient for this scope. We have clear entity relationships and don't need complex querying.

### Why NestJS?
- **Pros:** Enterprise-grade structure, excellent TypeScript support, built-in WebSocket support, modular architecture perfect for AI integrations
- **Cons:** Steeper learning curve, more boilerplate
- **Decision:** Clean architecture impresses in code reviews, makes AI module separation obvious

### Why React + Vite?
- **Pros:** Fast dev server, lightweight tooling, great for SPAs, minimal framework overhead
- **Cons:** Fewer built-in full-stack features than Next.js
- **Decision:** Vite keeps the frontend lean and focused for a challenge scope

### Why Minimal Testing?
- **Reason:** This is a challenge submission, not production code
- **Focus:** Working features, clean architecture, good documentation
- **What we test:** Only the AI service (core business logic, external integration)
- **What we skip:** Everything else can be manually tested

---

## Success Criteria

- [ ] Docker compose up runs everything successfully
- [ ] Can create campaigns and content pieces
- [ ] AI generation produces meaningful content
- [ ] Review workflow allows approve/reject/edit
- [ ] Real-time updates show across browser tabs
- [ ] Documentation explains setup and decisions
- [ ] Code is clean, readable, and well-structured

---

## Notes for Review

- Keep code DRY but don't over-abstract
- Prioritize working features over perfect code
- Make AI integration modular (easy to swap providers)
- Real-time updates should be reliable but don't need to be production-grade
- Documentation should show thought process, not just instructions
- When in doubt, choose the simpler solution
