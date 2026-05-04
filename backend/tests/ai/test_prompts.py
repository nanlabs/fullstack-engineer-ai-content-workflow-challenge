"""Tests for the prompt registry."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.ai.prompts.registry import PromptRegistry, registry


def test_registry_loads_headline_template() -> None:
    text = registry.get("headline_generation")
    assert "{brief}" in text
    assert "{content_type}" in text
    assert "{language}" in text


def test_registry_loads_description_template() -> None:
    text = registry.get("description_generation")
    assert "{brief}" in text


def test_registry_loads_translation_template() -> None:
    text = registry.get("translation")
    assert "{source_language}" in text
    assert "{target_language}" in text
    assert "{text}" in text


def test_registry_loads_metadata_extraction_template() -> None:
    text = registry.get("metadata_extraction")
    assert "{text}" in text


def test_registry_renders_headline_template() -> None:
    rendered = registry.render(
        "headline_generation",
        brief="Eco-friendly water bottle",
        content_type="headline",
        language="English",
        source_text="(none)",
    )
    assert "Eco-friendly water bottle" in rendered
    assert "headline" in rendered
    assert "English" in rendered
    assert "{brief}" not in rendered


def test_registry_renders_translation_template() -> None:
    rendered = registry.render(
        "translation",
        source_language="English",
        target_language="Spanish",
        text="Buy now and save!",
    )
    assert "English" in rendered
    assert "Spanish" in rendered
    assert "Buy now and save!" in rendered


def test_registry_missing_version_raises() -> None:
    with pytest.raises(FileNotFoundError):
        registry.get("headline_generation", version=99)


def test_registry_missing_template_raises() -> None:
    with pytest.raises(FileNotFoundError):
        registry.get("does_not_exist")


def test_registry_caches_template(tmp_path: Path) -> None:
    (tmp_path / "sample.v1.md").write_text("Hello {name}")
    reg = PromptRegistry(tmp_path)

    first = reg.get("sample")
    second = reg.get("sample")
    assert first is second  # same object from cache
