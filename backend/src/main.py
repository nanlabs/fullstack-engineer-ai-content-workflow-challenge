from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings

app = FastAPI(title="ACME Content Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers included in subsequent specs
# app.include_router(...)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
