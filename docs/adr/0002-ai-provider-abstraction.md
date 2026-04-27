# ADR 0002 — AI Provider Abstraction Layer

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Maximiliano Vitale

## Context

The system makes LLM calls for headline generation, translation, metadata extraction, and (in
spec 04) the full content workflow graph. We need a layer that isolates the rest of the system
from the Anthropic and OpenAI SDKs to enable: deterministic tests, provider swap, fallback,
cost/latency observability, and prompt versioning.

## Decisions

### `Protocol` over abstract base class

`LLMProvider` is defined as a `typing.Protocol` rather than an abstract base class (ABC).

Protocols use structural subtyping (duck typing): any class that implements the required
methods satisfies the protocol without inheriting from it. This means the real providers
(`AnthropicProvider`, `OpenAIProvider`) and the test mock (`MockProvider`) are fully
independent classes — no shared base, no import coupling. FastAPI dependency injection
receives an `LLMProvider`-typed value and calls methods on it; the concrete type is resolved
at the injection site. ABCs would require every provider to inherit from a shared base,
creating an unnecessary coupling between implementations.

### Three separate methods instead of a single method with flags

The interface exposes `generate`, `generate_stream`, and `generate_structured` as distinct
methods rather than a single `call(mode="stream"|"structured"|...)`.

Each method has a fundamentally different return shape:
- `generate` → `LLMResponse` (a single awaitable value)
- `generate_stream` → `AsyncIterator[LLMStreamChunk]` (a lazy async sequence)
- `generate_structured` → `tuple[T, LLMResponse]` (a validated Pydantic model + metadata)

A single entry point would force every caller to cast or narrow the return type at runtime,
defeating the purpose of static typing. Separate methods keep call sites explicit and
eliminate ambiguous signatures.

### Prompts in `.md` files over YAML/JSON

Prompt templates live in versioned `.md` files (`headline_generation.v1.md`, etc.) loaded by
`PromptRegistry` at runtime.

Markdown is human-readable, supports natural multi-line prose without escaping, and is
friendly to git diffs and code review. YAML and JSON require escaping newlines or use
multi-line block syntax that makes non-trivial prompts visually noisy and hard to edit.
Versioning is encoded in the filename (`.v1.md`, `.v2.md`), making the history explicit in
the repository without additional tooling.

### File-based prompts alongside LangChain `ChatPromptTemplate` — not as a replacement

`PromptRegistry` is used for direct, single-shot LLM calls (spec 03). For the LangGraph graph
nodes (spec 04), LangChain `ChatPromptTemplate` is used inside the graph.

`ChatPromptTemplate` adds value when prompts are composed, chained, or need to carry
message-history context inside a graph. For simple one-shot calls (translation, headline
generation), it is unnecessary overhead. Using the file-based registry keeps direct calls
lightweight and avoids a LangChain dependency in the provider layer itself.

## Consequences

- Every LLM call in the codebase goes through `LLMProvider`; SDKs are never imported outside
  `src/ai/providers/`.
- Tests replace the provider with `MockProvider(fixtures={...})` — zero real API calls in CI.
- Adding a new provider (e.g. Gemini) requires implementing three methods and one `case` in
  `get_provider()` — no base class changes.
- Prompt changes are reviewable as plain text diffs; rollback is a git revert.
- `LLMProviderDep` (FastAPI `Annotated` alias) is the single injection point for all endpoints
  that need LLM access.
