# Music Licensing Workflow Challenge

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
