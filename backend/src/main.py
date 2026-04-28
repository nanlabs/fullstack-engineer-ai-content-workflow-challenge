from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.ai.graph.runner import init_runner
from src.api.errors import DomainError
from src.api.routers import campaigns, content_pieces, drafts, workflows
from src.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await init_runner()
    yield


app = FastAPI(
    title="ACME Content Workflow API",
    description="Multilingual content workflow management powered by LLMs with human-in-the-loop.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DomainError)
async def domain_error_handler(request: object, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: object, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request",
                "details": jsonable_encoder(exc.errors()),
            }
        },
    )


app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(content_pieces.router, prefix="/api", tags=["content-pieces"])
app.include_router(drafts.router, prefix="/api", tags=["drafts"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
