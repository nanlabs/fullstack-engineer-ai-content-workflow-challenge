from __future__ import annotations

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    provider: str = "anthropic"


class GenerateResponse(BaseModel):
    workflow_run_id: str
    thread_id: str
    status: str
