from __future__ import annotations


class DomainError(Exception):
    code: str = "DOMAIN_ERROR"
    status_code: int = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    code = "NOT_FOUND"
    status_code = 404


class ValidationError(DomainError):
    code = "VALIDATION_ERROR"
    status_code = 422


class ConflictError(DomainError):
    code = "CONFLICT"
    status_code = 409
