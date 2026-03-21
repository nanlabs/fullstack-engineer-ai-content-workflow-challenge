# 🚀 Fullstack Engineer Challenge – AI Content Workflow

Welcome to the **Fullstack Engineer Challenge!** 🤖📝  
In this challenge, you'll help the fictional company **ACME GLOBAL MEDIA** build a system to manage the **content creation and review workflow** for their international campaigns — powered by **AI**.

## 🎯 Context

ACME GLOBAL MEDIA produces ads, micro-sites, and marketing materials in multiple languages.  
Traditionally, creating and translating this content is slow and error-prone. They want to experiment with **LLMs** to:

- Generate initial content drafts (headlines, product descriptions, etc.).
- Translate and localize content into multiple languages.
- Extract structured data (keywords, tone, sentiment).
- Keep a **review workflow** where humans can accept, edit, or reject AI suggestions.

Your task is to build a simple system to:

- Manage **campaigns** (each with multiple content pieces).
- Generate **AI-powered drafts** for a content piece using OpenAI or Anthropic.
- Provide **translation/localization** suggestions via AI.
- Track a **review state** (Draft → Suggested by AI → Reviewed → Approved/Rejected).
- Show updates to all users in real-time.

## 📌 Requirements

### ⚙️ Tech Stack

> ⚡ **Must Include** - Use the following technologies, aligned with our tech stack:

- **Backend:** You can use any stack you're comfortable with, but we recommend:
  - TypeScript + NestJS (Fastify/Koa also valid)  
  - Python + FastAPI (Flask/Django also valid)  
  - Go + Fiber (Gin/Echo also valid)  
- **API:** REST and/or GraphQL (justify your choice if only one)  
- **Frontend:** React (Next.js, Remix, or Vite)  
- **Database:** PostgreSQL (primary), MongoDB (optional if needed)  
- **Containerization:** Docker (required)  
- **AI Integrations:** OpenAI and/or Anthropic SDKs (required)  
- **Bonus:** LangChain, Kafka, Redis, ArgoCD, Kubernetes  

### 📦 Deliverables

> 📥 **Your submission must be a Pull Request that includes:**

- A **backend API** that supports:
  - Creating a campaign and its content pieces.
  - Generating AI drafts (titles, descriptions, translations).
  - Updating the review state of content.
  - Querying campaigns with their content and review states.
- A **frontend built with React** to:
  - Display a campaign dashboard.
  - Trigger AI draft generation.
  - Provide UI to review/edit/approve/reject drafts.
  - Show updates in real-time.
- Docker setup to run the entire app locally.
- A `README.md` with:
  - Setup instructions.
  - Tech decisions and tradeoffs.
  - If applicable, reasoning for REST, GraphQL, or both.
- A `docs/` folder for any diagrams, workflows, or extra notes.

### 📂 Suggested Folder Structure

```txt
/
├── .github/
│   ├── workflows/
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
├── backend/
│   ├── src/
│   ├── test/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── public/
│   └── Dockerfile
├── compose.yml
├── .env.example
├── README.md
├── .prettierrc.js
├── eslint.config.mjs
└── ...
````

## 🌟 Nice to Have

> 💡 **Bonus Points For:**

* Using **LangChain** to chain AI tasks (generate → translate → summarize).
* Supporting **multi-model comparison** (OpenAI vs Anthropic).
* Real-time features with WebSockets, GraphQL Subscriptions, or SSE.
* Automated testing & GitHub Actions CI pipeline.
* Unit/integration tests for API or AI-related logic.
* Using Redis/Kafka for async event messaging.
* Deploy manifests for Kubernetes or ArgoCD.

## 🧪 Submission Guidelines

1. **Fork this repository.**
2. **Create a feature branch** for your implementation.
3. **Commit your changes** with meaningful commit messages.
4. **Open a Pull Request** following the provided template.
5. **Our team will review** and provide feedback.

## ✅ Evaluation Criteria

> 🔍 **What we'll be looking at:**

* Ability to work **across the stack** (NestJS/FastAPI/Go + PostgreSQL + React).
* Integration of **AI features** in a clean, modular way.
* Clear **data modeling** and workflow management.
* **Human-in-the-loop UX** for reviewing AI content.
* Documentation of assumptions, tradeoffs, and AI design choices.
* Creativity in using AI to enhance the workflow.

## 💬 Final Notes

This challenge is designed to be **flexible**. Some tips:

* If you’re stronger in backend, focus there but add a simple UI.
* If you’re stronger in frontend, ensure your backend has clean APIs.
* Time-box your work — we want to see **how you think and solve problems**, not perfection.
* Surprise us with creative uses of AI! 🎉

## 🏁 Good luck and have fun building!


```
