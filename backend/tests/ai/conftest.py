"""Shared fixtures for AI layer tests."""

from __future__ import annotations

import json

import pytest

from src.ai.providers.mock import MockProvider


@pytest.fixture
def mock_provider() -> MockProvider:
    return MockProvider(
        fixtures={
            "headline": "Spring Awakening: Bold New Colors",
            "translation to es": "Despertar de Primavera: Audaces Colores Nuevos",
            "translation to fr": "Éveil du Printemps: Audacieuses Nouvelles Couleurs",
            "metadata": json.dumps(
                {
                    "sentiment": "positive",
                    "tone": "aspirational",
                    "keywords": ["spring", "colors", "bold"],
                    "estimated_reading_time_seconds": 3,
                }
            ),
        }
    )
