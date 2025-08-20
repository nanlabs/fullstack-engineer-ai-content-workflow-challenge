# Music Licensing Workflow Challenge

This project was built as part of a technical challenge for a position that requested a stack based on **NestJS** and **Next.js**.  
My background is mainly with **Vue** on the frontend and **Django/Express** on the backend, but for this challenge I wanted to stick to the tools they use. It felt like a good opportunity to get hands-on with Nest and Next, and to show that I can adapt quickly to new stacks.

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
