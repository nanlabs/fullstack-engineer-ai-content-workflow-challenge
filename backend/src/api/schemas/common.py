from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


# Generic[T] form required for Pydantic v2 compatibility (type-param syntax not yet supported)
class PaginatedResponse(BaseModel, Generic[T]):  # noqa: UP046
    items: list[T]
    total: int
    limit: int
    offset: int
