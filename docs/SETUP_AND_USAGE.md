# 🚀 ACME AI Content Workflow - Setup & Usage Guide

## 📋 Project Overview

A fullstack AI-powered content creation and review workflow system. Users can create marketing campaigns, generate AI drafts using multiple models (OpenAI/Anthropic), and manage a human-in-the-loop review process with real-time updates.

## 🏗️ Tech Stack

- **Backend:** NestJS (TypeScript) with modular architecture
- **Database:** PostgreSQL with Prisma ORM
- **Real-time:** WebSocket with Socket.IO
- **Frontend:** Next.js with React and Tailwind CSS
- **AI Integration:** OpenAI and Anthropic models with cost tracking
- **Containerization:** Docker Compose

## 🚀 Quick Start

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
```

Edit `.env` file with your API keys:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/acme_ai_workflow"

# AI API Keys
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Redis (for WebSocket)
REDIS_URL="redis://localhost:6379"
```

### 2. Start Services
```bash
# Start database and Redis
docker-compose up -d postgres redis

# Wait a few seconds for services to start, then start the full stack
docker-compose up -d
```

### 3. Database Setup
```bash
# Navigate to backend directory
cd backend

# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend  
cd frontend
npm run dev
```

## 🌐 Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Database:** localhost:5432

## 🧪 API Testing with cURL

### Health Check
```bash
curl http://localhost:3001/health
```

### 1. Create a Campaign
```bash
curl -X POST http://localhost:3001/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q4 Product Launch",
    "description": "Marketing campaign for our new product launch",
    "targetAudience": "Tech professionals",
    "budget": 50000
  }'
```

### 2. Create Content Pieces
```bash
# Create a headline content piece
curl -X POST http://localhost:3001/content-pieces \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Product Headline",
    "contentType": "headline",
    "language": "EN",
    "campaignId": "YOUR_CAMPAIGN_ID"
  }'

# Create a call-to-action content piece
curl -X POST http://localhost:3001/content-pieces \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CTA Button",
    "contentType": "call-to-action",
    "language": "EN",
    "campaignId": "YOUR_CAMPAIGN_ID"
  }'
```

### 3. Upload Documents
```bash
curl -X POST http://localhost:3001/documents/upload \
  -F "file=@/path/to/your/document.pdf" \
  -F "campaignId=YOUR_CAMPAIGN_ID" \
  -F "name=Product Specification"
```

### 4. Generate AI Drafts
```bash
# Generate with GPT-3.5 Turbo
curl -X POST http://localhost:3001/ai-generation/generate-draft \
  -H "Content-Type: application/json" \
  -d '{
    "contentPieceId": "YOUR_CONTENT_PIECE_ID",
    "prompt": "Create a catchy headline for our new AI-powered product",
    "contentType": "headline",
    "language": "EN",
    "modelName": "gpt-3.5-turbo"
  }'

# Generate with Claude 3 Haiku (requires ANTHROPIC_API_KEY)
curl -X POST http://localhost:3001/ai-generation/generate-draft \
  -H "Content-Type: application/json" \
  -d '{
    "contentPieceId": "YOUR_CONTENT_PIECE_ID",
    "prompt": "Write a compelling call-to-action for our product",
    "contentType": "call-to-action",
    "language": "EN",
    "modelName": "claude-3-haiku"
  }'
```

### 5. Get Available AI Models
```bash
curl http://localhost:3001/ai-generation/models
```

### 6. Get Cost Summary
```bash
# Campaign cost summary
curl http://localhost:3001/ai-generation/cost-summary/campaign/YOUR_CAMPAIGN_ID

# Global cost statistics
curl http://localhost:3001/ai-generation/cost-summary/global
```

### 7. Review Drafts
```bash
# Approve a draft
curl -X PATCH http://localhost:3001/content-pieces/YOUR_CONTENT_PIECE_ID/drafts/YOUR_DRAFT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "reviewState": "APPROVED"
  }'

# Reject a draft
curl -X PATCH http://localhost:3001/content-pieces/YOUR_CONTENT_PIECE_ID/drafts/YOUR_DRAFT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "reviewState": "REJECTED"
  }'
```

## 🎯 Frontend Usage

### Creating Content
1. **Create Campaign:** Click "Create Campaign" and fill in details
2. **Add Content Pieces:** Select a campaign and add headlines, CTAs, etc.
3. **Upload Documents:** Use the Documents tab to upload reference materials
4. **Generate AI Drafts:** Click "Generate AI Draft" on any content piece

### AI Model Selection
- Choose from 6 different AI models (GPT and Claude variants)
- See real-time cost estimates before generation
- Track usage costs across campaigns and content pieces

### Real-time Features
- Live updates when other users make changes
- Real-time progress tracking during AI generation
- Instant notifications for new drafts and reviews

## 🔧 Development Workflow

### Daily Development
```bash
# Start services
docker-compose up -d postgres redis

# Start backend (Terminal 1)
cd backend && npm run start:dev

# Start frontend (Terminal 2)  
cd frontend && npm run dev
```

### When Done Coding
```bash
# Stop all services
docker-compose down
```

## 🐛 Troubleshooting

### Common Issues

**Docker containers not starting:**
```bash
# Check Docker Desktop is running
docker ps

# Restart services
docker-compose down
docker-compose up -d
```

**Database connection errors:**
```bash
# Check PostgreSQL is running
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

**AI Generation errors:**
- Ensure API keys are set in `.env` file
- Check that you have credits/access to the selected AI model
- Verify the model name is correct (use `/ai-generation/models` endpoint)

## 📊 Features Implemented

### ✅ Core Features
- **Campaign Management:** Create, edit, delete marketing campaigns
- **Content Piece Management:** Headlines, CTAs, descriptions, translations
- **AI Draft Generation:** Multi-model support (OpenAI + Anthropic)
- **Document Upload:** PDF, TXT, DOCX support with RAG integration
- **Review Workflow:** AI suggested → Human reviewed → Approved/Rejected
- **Real-time Updates:** WebSocket-powered live collaboration
- **Cost Tracking:** Per-model, per-draft, per-campaign cost analysis

### ✅ Advanced Features
- **Multi-Model Support:** 6 different AI models with cost comparison
- **Chain of Thoughts:** Real-time AI generation progress tracking
- **Document RAG:** AI uses uploaded documents for context
- **Web Search Integration:** AI can search the web for current information
- **Translation Support:** Multi-language content generation
- **Cost Analytics:** Detailed cost breakdowns and reporting

## 🎉 Next Steps

1. **Add more AI models** (GPT-4o, Claude 3.5 Sonnet, etc.)
2. **Implement team collaboration** features
3. **Add content scheduling** and publishing workflows
4. **Enhance analytics** with performance tracking
5. **Add content templates** for common use cases

---

*Ready to create amazing AI-powered content workflows! 🚀*
