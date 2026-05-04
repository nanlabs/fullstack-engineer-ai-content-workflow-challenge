from __future__ import annotations

# Prices in USD per 1M tokens (reference values at development time — verify before final delivery)
PRICING: dict[str, tuple[float, float]] = {
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-3-5-sonnet-20241022": (3.00, 15.00),
    "claude-3-5-haiku-20241022": (1.00, 5.00),
    "gpt-5.4": (3.75, 15.00),
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
    "mock-model-v1": (0.0, 0.0),
}


def estimate_cost(model: str, tokens_in: int, tokens_out: int) -> float:
    in_price, out_price = PRICING.get(model, (0.0, 0.0))
    return round((tokens_in * in_price + tokens_out * out_price) / 1_000_000, 6)
