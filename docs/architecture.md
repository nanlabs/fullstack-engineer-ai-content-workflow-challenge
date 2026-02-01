# Architecture

## Overview
This project is a lean, containerized stack for ACME GLOBAL MEDIA's AI content workflow.

## Core Components
- **Backend**: NestJS API (REST) with PostgreSQL and AI integrations.
- **Frontend**: React + Vite application using Tailwind CSS.
- **Database**: PostgreSQL 15 for campaign and content storage.
- **Real-time**: Socket.io for broadcast updates.

## Data Flow
1. Users create campaigns and content pieces via the frontend.
2. Backend persists data to PostgreSQL and emits realtime events.
3. AI generation requests call OpenAI and store drafts/translations.
4. Review decisions update state and notify connected clients.

## Deployment
Docker Compose orchestrates `frontend`, `backend`, and `postgres` services for local development.
