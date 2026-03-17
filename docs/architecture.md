# System Architecture

This system generates AI-driven marketing campaigns using an asynchronous workflow.

The architecture is composed of:

Frontend
- React application
- Allows users to create campaigns and monitor progress

Backend
- NestJS API
- Manages workflows and orchestrates AI generation

Queue & Background Processing
- Redis queue
- Handles asynchronous AI tasks

Realtime Updates
- WebSockets
- Push workflow updates to the frontend

Database
- PostgreSQL
- Stores campaigns, content pieces, and generation steps

AI Providers
- OpenAI
- Anthropic


# Architecture diagram

User
 ↓
React Frontend
 ↓
NestJS API
 ↓
Campaign Service
 ↓
Redis Queue
 ↓
Worker / Orchestrator
 ↓
AI Providers
(OpenAI / Anthropic)
 ↓
PostgreSQL