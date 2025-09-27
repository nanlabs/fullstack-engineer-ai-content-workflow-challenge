# 🚀 ACME AI Workflow Challenge - Developer Instructions

## 📋 Overview
This project implements a fullstack system for managing AI-powered content creation and review workflows. The system allows users to create campaigns, generate AI drafts, and manage a human-in-the-loop review process.

## 🏗️ Architecture

### Tech Stack
- **Backend:** NestJS (TypeScript) with modular architecture
- **Database:** PostgreSQL with Prisma ORM
- **Queue System:** Redis + BullMQ (for background AI processing)
- **Real-time:** WebSocket with Socket.IO
- **Frontend:** Next.js with React Query and TipTap editor
- **Containerization:** Docker Compose
- **AI Integration:** OpenAI and Anthropic SDKs

### Project Structure
```
/
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── campaigns/   # Campaign CRUD operations
│   │   │   ├── content-pieces/ # Content piece management
│   │   │   ├── ai-generation/  # AI draft generation
│   │   │   └── websockets/     # Real-time updates
│   │   └── prisma/         # Database service
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── Dockerfile
├── frontend/               # Next.js React application
├── docs/                  # Documentation
├── compose.yml            # Docker services configuration
└── .env.example          # Environment variables template
```

## 🗄️ Database Schema

### Models
- **Campaign:** Marketing campaigns with multiple content pieces
- **ContentPiece:** Individual content items (headlines, descriptions, translations)
- **Draft:** AI-generated content with review workflow states

### Review Workflow
```
DRAFT → SUGGESTED_BY_AI → REVIEWED → APPROVED/REJECTED
```

## 🚀 Quick Start Guide

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed
- Git installed

### 1. Environment Setup
```bash
# Clone and navigate to project
git clone <repository-url>
cd fullstack-engineer-ai-content-workflow-challenge

# Copy environment variables
cp .env.example .env
# Edit .env with your AI API keys:
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
```

### 2. Start Database Services
```bash
# From project root directory
docker-compose up -d postgres redis
docker-compose up -d
```

### 3. Setup Database Schema
```bash
# Navigate to backend directory
cd backend

# Run database migration (one-time setup)
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 4. Start Backend Server
```bash
# From backend directory
npm run start:dev
```

### 5. Start Frontend (when implemented)
```bash
# From frontend directory
npm run dev
```

## 🔧 Development Workflow

### Daily Development
1. **Start Docker Desktop**
2. **Start services:** `docker-compose up -d postgres redis` (from root)
3. **Start backend:** `cd backend && npm run start:dev`
4. **Start frontend:** `cd frontend && npm run dev` (when ready)

### When Done Coding
```bash
# Stop all services (from root)
docker-compose down
```

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:3001/campaigns
```

### Create Test Campaign
```bash
curl -X POST http://localhost:3001/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Campaign","description":"My first campaign"}'
```

### Create Content Piece
```bash
curl -X POST http://localhost:3001/content-pieces \
  -H "Content-Type: application/json" \
  -d '{"title":"Product Headline","contentType":"headline","campaignId":"<campaign-id>"}'
```

### Generate AI Draft
```bash
curl -X POST http://localhost:3001/ai-generation/generate-draft \
  -H "Content-Type: application/json" \
  -d '{"contentPieceId":"<content-piece-id>","prompt":"Generate a catchy headline"}'
```

## 📊 Challenge Requirements Compliance

### ✅ Backend API Features
- [ ] Campaign CRUD operations (`/campaigns`)
- [ ] Content piece management (`/content-pieces`)
- [ ] AI draft generation endpoint (`/ai-generation/generate-draft`)
- [ ] Review state management (Draft → Suggested by AI → Reviewed → Approved/Rejected)
- [ ] Real-time updates via WebSocket
- [ ] PostgreSQL database with Prisma ORM
- [ ] Docker containerization

### 🔄 In Progress
- [ ] Frontend React application
- [ ] AI integration (OpenAI/Anthropic)
- [ ] Background job processing with BullMQ
- [ ] Real-time UI updates

### 🎯 MVP Priorities
1. **Backend CRUD** 🔄 Complete
2. **AI Draft Generation** 🔄 Service structure ready
3. **Real-time Updates** 🔄 WebSocket gateway ready
4. **Frontend Dashboard** 🔄 Next step
5. **Docker Compose** 🔄 Complete

## 🔍 Architecture Decisions

### Why NestJS?
- **Modular architecture** aligns with challenge requirements
- **Built-in WebSocket support** for real-time features
- **TypeScript-first** for better development experience
- **Enterprise-ready** with dependency injection

### Why Prisma?
- **Type-safe database access** with auto-generated types
- **Migration system** for database schema management
- **PostgreSQL support** as required by challenge
- **Developer-friendly** with excellent tooling

### Why Docker Compose?
- **Local development** with all services in containers
- **Consistent environment** across different machines
- **Easy service management** with single command
- **Production-ready** deployment configuration

## 🐛 Troubleshooting

### Common Issues

**Docker containers not starting:**
```bash
# Check Docker Desktop is running
docker ps

# Restart Docker Desktop if needed
# Then try again:
docker-compose up -d postgres redis
```

**Database connection errors:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker-compose logs postgres
```

**Prisma migration errors:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or create new migration
npx prisma migrate dev --name fix-schema
```

**Backend server not starting:**
```bash
# Check if all dependencies are installed
npm install

# Check for TypeScript errors
npm run build
```

## 📝 Notes for Evaluators

### Key Files to Review
- `backend/prisma/schema.prisma` - Database design
- `backend/src/modules/` - Feature modules implementation
- `compose.yml` - Service configuration

### Evaluation Focus Areas
1. **Code Quality:** NestJS modular architecture, TypeScript usage
2. **Database Design:** Proper relationships, review workflow states
3. **API Design:** RESTful endpoints, proper error handling
4. **Real-time Features:** WebSocket implementation
5. **AI Integration:** Clean service architecture for AI features
6. **Docker Setup:** Complete local development environment

### Testing Checklist
- [ ] All services start with `docker-compose up`
- [ ] Database migrations run successfully
- [ ] API endpoints respond correctly
- [ ] WebSocket connections work
- [ ] Environment variables are properly configured

## 🎉 Next Steps
1. Implement AI generation with OpenAI/Anthropic
2. Build Next.js frontend with React Query
3. Add background job processing with BullMQ
4. Implement real-time UI updates
5. Add comprehensive testing

---
*This documentation is maintained as part of the ACME AI Workflow Challenge implementation.*