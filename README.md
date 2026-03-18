# 🚀 Fullstack Engineer Challenge – AI Content Workflow

Welcome to the **Fullstack Engineer Challenge!** 🤖📝  
This project implements an AI-powered system for managing **content creation and review workflows** for international marketing campaigns.

---

## ⚡ Quick Start (Setup)

### Prerequisites

- Docker and Docker Compose
- (Optional) OpenAI API key for AI features

### Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173  
- Backend API docs: http://localhost:8000/docs  

---

## ✨ Features Implemented

- Campaign creation and management  
- AI draft generation  
- AI translation/localization  
- Human-in-the-loop review workflow  
- End-to-end pipeline execution  
- Dockerized environment  

---

## 🏗️ Architecture

- Frontend: React + Vite  
- Backend: FastAPI  
- DB: PostgreSQL  
- AI Layer: OpenAI / Anthropic (abstracted)  

---

## 🔄 Workflow

Draft → AI Suggestion → Review → Approve / Reject  

---

## ⚙️ Tech Stack

- FastAPI  
- React  
- PostgreSQL  
- Docker  

---

## 🚀 Run Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn src.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 💡 Notes

- Designed with extensibility in mind  
- Easy to plug new AI providers  
- Ready for async pipelines and real-time updates  

---

## 🏁 Thanks for reviewing!
