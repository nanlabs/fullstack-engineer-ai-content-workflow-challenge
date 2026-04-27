"""Tests for cost estimation."""

from __future__ import annotations

import pytest

from src.ai.costs import PRICING, estimate_cost


def test_estimate_cost_claude_sonnet() -> None:
    # 1000 input @ $3/1M + 500 output @ $15/1M = $0.003 + $0.0075 = $0.0105
    cost = estimate_cost("claude-3-5-sonnet-20241022", tokens_in=1000, tokens_out=500)
    assert cost == pytest.approx(0.0105, rel=1e-6)


def test_estimate_cost_mock_is_zero() -> None:
    cost = estimate_cost("mock-model-v1", tokens_in=10000, tokens_out=10000)
    assert cost == 0.0


def test_estimate_cost_unknown_model_is_zero() -> None:
    cost = estimate_cost("unknown-model-xyz", tokens_in=500, tokens_out=500)
    assert cost == 0.0


def test_estimate_cost_gpt4o() -> None:
    # 1000 input @ $2.50/1M + 1000 output @ $10/1M = $0.0025 + $0.01 = $0.0125
    cost = estimate_cost("gpt-4o", tokens_in=1000, tokens_out=1000)
    assert cost == pytest.approx(0.0125, rel=1e-6)


def test_pricing_table_has_expected_models() -> None:
    assert "claude-3-5-sonnet-20241022" in PRICING
    assert "gpt-4o" in PRICING
    assert "mock-model-v1" in PRICING
