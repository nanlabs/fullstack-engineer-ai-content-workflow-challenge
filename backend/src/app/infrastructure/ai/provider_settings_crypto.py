from __future__ import annotations

from hashlib import sha256

from cryptography.fernet import Fernet, InvalidToken


def encrypt_api_key(api_key: str, encryption_key: str) -> str:
    return _get_fernet(encryption_key).encrypt(api_key.encode("utf-8")).decode("utf-8")


def decrypt_api_key(encrypted_api_key: str, encryption_key: str) -> str:
    try:
        return _get_fernet(encryption_key).decrypt(encrypted_api_key.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Stored AI provider credentials could not be decrypted.") from exc


def fingerprint_api_key(api_key: str) -> str:
    return sha256(api_key.encode("utf-8")).hexdigest()


def _get_fernet(encryption_key: str) -> Fernet:
    if not encryption_key:
        raise ValueError("AI_SETTINGS_ENCRYPTION_KEY is required to store provider settings.")
    try:
        return Fernet(encryption_key.encode("utf-8"))
    except Exception as exc:  # pragma: no cover - invalid key format
        raise ValueError("AI_SETTINGS_ENCRYPTION_KEY is not a valid Fernet key.") from exc
