from __future__ import annotations

import os

import uvicorn


def main() -> None:
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run(
        "app.main:create_app",
        factory=True,
        host="127.0.0.1",
        port=port,
        reload=True,
    )
