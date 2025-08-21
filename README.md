# Music Licensing Workflow Challenge

## Tech Decisions & Trade-offs

This project was built as part of a technical challenge for a position that requested a stack based on **NestJS** and **Next.js**.  

My background is mainly with **Vue** on the frontend and **Django/Express** on the backend, but for this challenge I wanted to stick to the tools they use. It was a good opportunity to get hands-on with Nest and Next, and to show that I can adapt quickly to new stacks.

Because this stack came with a learning curve for me, some parts of the implementation were approached with pragmatism—balancing learning, speed, and quality. My main goal was to meet the requirements while keeping the code as clear and maintainable as possible, knowing there’s always room to improve with more time and experience on this stack.

## Implementation Overview

### Frontend
- **Movies list** – shows all movies in the system.  
- **Movie detail view** with:
  - Scene creation  
  - Track creation  
  - Track status update  
  - Track–Song association  
- **Real-time updates** – the UI reacts instantly to **scene creation**, **track creation**, **track–song association**, and **status changes** via GraphQL subscriptions.

### Real-time events
The frontend subscribes to domain events so all users see changes immediately:
- **SCENE_CREATED** – a new scene is added to a movie.
- **TRACK_CREATED** – a new track is added to a scene.
- **TRACK_SONG_SET** – a song gets linked to a track.
- **TRACK_STATUS_UPDATED** – licensing workflow updates.

These are delivered through GraphQL Subscriptions.

### Why GraphQL (kept simple)

I used **GraphQL only** to keep the project small and consistent:

- **One schema, one client**: queries, mutations, and subscriptions share the same types definitions.
- **Real-time built-in**: subscriptions handle scene/track creation, song association, and status changes without extra plumbing.
- **No over/under-fetching**: nested data (movie → scenes → tracks → songs) comes in exactly the shape the UI needs.

### Backend
- **PostgreSQL database**
- **GraphQL API** – chosen instead of REST to simplify the schema, leverage type safety, and support real-time GraphQL Subscriptions.  

### Containerization
- **Docker & Docker Compose** – one command to run the full stack (frontend, backend, and database).

### Future Improvements

- **Optimize nested queries with DataLoader** – current resolvers may suffer from the **N+1 query problem** (e.g. fetching scenes for each movie separately). Using [DataLoader](https://github.com/graphql/dataloader) would batch and cache requests, turning multiple small queries into a single query, improving performance on deeply nested queries (movies → scenes → tracks → songs).
- **Optimize updates on the frontend** – currently, after a real-time event (like a track status change), the app does a full refetch of the list. A better approach would be to update only the affected item (e.g., insert a new track, update a status field) so the UI feels instant and uses less network.
- **CRUD completeness** – extend functionality to cover creation and modification of movies, modification of scenes, modification of tracks, and creation/modification of songs.
- Add more unit and integration tests.
- Improve error handling and input validation.    
- Add pagination, search, and filtering for large datasets.  

## Requirements
- Docker & Docker Compose

---

## Setup

1. **Build & start services**
    
    `docker compose up --build`

    Services available:
    - **Frontend** → http://localhost:3000  
    - **Backend** → http://localhost:3001
    - **Postgres** → localhost:5432

2. **Seed the database**
    
    `docker compose exec backend npm run seed:data`

3. **Stop the services**
    
    `docker compose down`

4. **Reset the database (optional)**
    
    `docker compose down -v`

---

## Notes
- The `.env` file is already included in the repository root.
- Database data is persisted in the `db_data` volume.
