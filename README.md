# 🚀 ACME Global Media - AI Content Workflow System

A fullstack application for managing AI-powered content creation and review workflows for international marketing campaigns.

## 🎯 Overview

This system helps ACME Global Media streamline their content creation process by leveraging AI to:

- Generate initial content drafts (headlines, product descriptions, social posts, etc.)
- Translate and localize content into multiple languages
- Manage content review workflows (Draft → AI Generated → Reviewed → Approved/Rejected)
- Provide real-time updates across all connected users

## 🏗️ Architecture

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **API**: RESTful endpoints with WebSocket support for real-time updates
- **AI Integration**: OpenAI SDK for content generation and translation
- **Authentication**: JWT-based authentication with bcrypt password hashing

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io client for live updates
- **HTTP Client**: Axios for API communication
- **Notifications**: React Hot Toast for user feedback

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database Migration**: Prisma migrate with seeding
- **Development**: Hot reload for both frontend and backend

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- OpenAI API key (required for AI features)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd fullstack-engineer-ai-content-workflow-challenge
```

### 2. Environment Configuration

Copy the environment template and configure your API keys:

```bash
cp .env.example .env
```

**Important**: Edit `.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY="sk-your-actual-openai-api-key-here"
```

### 3. Start with Docker

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

This will start:
- **PostgreSQL**: `localhost:5432`
- **Backend API**: `localhost:3001`
- **Frontend App**: `localhost:3000`

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:3001/api (Swagger UI)
- **Database**: PostgreSQL on port 5432

## 🛠️ Development Setup

### Local Development (without Docker)

1. **Start PostgreSQL**:
```bash
# Using Docker for just the database
docker run --name postgres-dev -e POSTGRES_PASSWORD=password -e POSTGRES_DB=acme_content_workflow -p 5432:5432 -d postgres:15
```

2. **Backend Setup**:
```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

3. **Frontend Setup**:
```bash
cd frontend
npm install
npm run dev
```

## 📊 Database Schema

The system uses the following main entities:

- **Users**: Authentication and user management
- **Campaigns**: Marketing campaign containers
- **ContentPieces**: Individual content items (headlines, descriptions, etc.)
- **Translations**: AI-generated translations for content pieces

### Content Types Supported
- Social Media Posts
- Email Subjects & Bodies
- Product Descriptions
- Blog Posts
- Ad Copy & Headlines

### Workflow States
- `DRAFT` → `AI_GENERATED` → `APPROVED`/`REJECTED`

## 🤖 AI Features

### Content Generation
- **OpenAI Integration**: GPT models for creative content generation
- **Multiple Content Types**: Tailored prompts for different content formats
- **Token Tracking**: Monitor API usage and costs

### Translation & Localization
- **Multi-language Support**: AI-powered translation to various languages
- **Context-aware Translation**: Maintains marketing tone and brand voice
- **Translation Status Tracking**: Manage translation workflows

### Prompt Engineering
- Custom prompts optimized for each content type
- Brand voice and tone guidelines integration

## 🔄 Real-time Features

- **WebSocket Integration**: Live updates when content is generated or reviewed
- **Collaborative Editing**: Multiple users can work on campaigns simultaneously
- **Instant Notifications**: Real-time feedback on content status changes

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm run test
```


## 🚦 Tech Decisions & Tradeoffs

### Why REST over GraphQL?
- **Simplicity**: Easier to implement and debug for this scope
- **Caching**: Better HTTP caching strategies
- **Team Familiarity**: Faster development with REST patterns
- **Future Flexibility**: Can add GraphQL later if needed

### Why Prisma?
- **Type Safety**: Generated TypeScript client
- **Migration Management**: Robust schema evolution
- **Query Performance**: Optimized database queries
- **Developer Experience**: Excellent tooling and documentation
## 🆘 Troubleshooting

### Common Issues

**Docker containers won't start:**
```bash
docker-compose down -v
docker-compose up --build
```

**Database connection issues:**
- Check PostgreSQL is running on port 5432
- Verify DATABASE_URL in .env file
- Run database migrations: `docker-compose exec backend npm run db:migrate`

**AI features not working:**
- Verify OPENAI_API_KEY is set correctly
- Check API key has sufficient credits
- Review backend logs: `docker-compose logs backend`

**Frontend not connecting to backend:**
- Ensure NEXT_PUBLIC_API_URL points to correct backend URL
- Check CORS settings in backend configuration