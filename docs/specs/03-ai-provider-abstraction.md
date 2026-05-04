# Spec 03 — AI Provider Abstraction

## Goal

Build the layer that isolates the rest of the system from the Anthropic and OpenAI SDKs. Any LLM call in the project goes through here. This enables: deterministic tests, swap of provider, fallback, cost/latency observability, and modeling prompts as first-class entities.

## Out of scope

- The LangGraph graph (spec 04 builds on top of this layer).
- HTTP endpoints that trigger AI (spec 04).
- SSE streaming to the frontend (spec 06).

## Design

### Layout

```
backend/src/ai/
├── __init__.py
├── providers/
│   ├── __init__.py
│   ├── base.py           # Protocol + dataclasses
│   ├── anthropic.py
│   ├── openai.py
│   ├── mock.py           # for tests
│   └── factory.py        # get_provider(name) -> LLMProvider
├── prompts/
│   ├── __init__.py
│   ├── registry.py       # loads prompts from files
│   └── templates/
│       ├── headline_generation.v1.md
│       ├── description_generation.v1.md
│       ├── translation.v1.md
│       └── metadata_extraction.v1.md
├── costs.py              # pricing table, estimate_cost function
└── observability.py      # decorator for logging calls
```

### Provider protocol

`backend/src/ai/providers/base.py`:

```python
from typing import Protocol, AsyncIterator, TypeVar
from pydantic import BaseModel
from dataclasses import dataclass

T = TypeVar("T", bound=BaseModel)


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    cost_usd: float
    raw: dict | None = None


@dataclass
class LLMStreamChunk:
    delta: str
    is_final: bool = False
    response: LLMResponse | None = None  # populated on is_final


class LLMProvider(Protocol):
    name: str
    default_model: str

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> LLMResponse: ...

    async def generate_stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[LLMStreamChunk]: ...

    async def generate_structured(
        self,
        prompt: str,
        schema: type[T],
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> tuple[T, LLMResponse]: ...
```

### Implementation: Anthropic

Using `anthropic==0.97.0`:

```python
from anthropic import AsyncAnthropic


class AnthropicProvider:
    name = "anthropic"
    default_model = "claude-3-5-sonnet-20241022"

    def __init__(self, api_key: str):
        self._client = AsyncAnthropic(api_key=api_key)

    async def generate(self, prompt, *, system=None, model=None, max_tokens=1024, temperature=0.7):
        start = time.perf_counter()
        msg = await self._client.messages.create(
            model=model or self.default_model,
            system=system or "",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        latency_ms = int((time.perf_counter() - start) * 1000)
        text = "".join(b.text for b in msg.content if b.type == "text")
        return LLMResponse(
            content=text,
            model=msg.model,
            provider=self.name,
            tokens_in=msg.usage.input_tokens,
            tokens_out=msg.usage.output_tokens,
            latency_ms=latency_ms,
            cost_usd=estimate_cost(msg.model, msg.usage.input_tokens, msg.usage.output_tokens),
        )

    async def generate_stream(self, prompt, **kwargs):
        async with self._client.messages.stream(...) as stream:
            async for text in stream.text_stream:
                yield LLMStreamChunk(delta=text)
            final = await stream.get_final_message()
            yield LLMStreamChunk(
                delta="",
                is_final=True,
                response=LLMResponse(...),  # build from `final`
            )

    async def generate_structured(self, prompt, schema, **kwargs):
        # Anthropic structured output via tool use
        tool = {
            "name": "extract",
            "description": "Extract structured data",
            "input_schema": schema.model_json_schema(),
        }
        msg = await self._client.messages.create(
            tools=[tool],
            tool_choice={"type": "tool", "name": "extract"},
            messages=[{"role": "user", "content": prompt}],
            ...
        )
        tool_use = next(b for b in msg.content if b.type == "tool_use")
        parsed = schema.model_validate(tool_use.input)
        return parsed, LLMResponse(...)
```

### Implementation: OpenAI

Using `openai==2.32.0`. The Chat Completions API still works; for structured output, use `response_format={"type": "json_schema", ...}`:

```python
from openai import AsyncOpenAI


class OpenAIProvider:
    name = "openai"
    default_model = "gpt-4o"

    def __init__(self, api_key: str):
        self._client = AsyncOpenAI(api_key=api_key)

    async def generate(self, prompt, *, system=None, model=None, max_tokens=1024, temperature=0.7):
        start = time.perf_counter()
        completion = await self._client.chat.completions.create(
            model=model or self.default_model,
            messages=[
                *([{"role": "system", "content": system}] if system else []),
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        latency_ms = int((time.perf_counter() - start) * 1000)
        return LLMResponse(
            content=completion.choices[0].message.content or "",
            model=completion.model,
            provider=self.name,
            tokens_in=completion.usage.prompt_tokens,
            tokens_out=completion.usage.completion_tokens,
            latency_ms=latency_ms,
            cost_usd=estimate_cost(completion.model, completion.usage.prompt_tokens, completion.usage.completion_tokens),
        )

    async def generate_structured(self, prompt, schema, **kwargs):
        completion = await self._client.chat.completions.create(
            model=kwargs.get("model") or self.default_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": schema.__name__,
                    "schema": schema.model_json_schema(),
                    "strict": True,
                },
            },
            ...
        )
        parsed = schema.model_validate_json(completion.choices[0].message.content)
        return parsed, LLMResponse(...)
```

### Implementation: Mock

```python
class MockProvider:
    name = "mock"
    default_model = "mock-model-v1"

    def __init__(self, fixtures: dict[str, str] | None = None):
        self._fixtures = fixtures or {}

    async def generate(self, prompt, **kwargs) -> LLMResponse:
        # match prompt keyword to fixture, otherwise return generic
        for key, val in self._fixtures.items():
            if key in prompt.lower():
                return _make_response(val)
        return _make_response(f"[mock response to: {prompt[:50]}...]")

    async def generate_stream(self, prompt, **kwargs):
        full = (await self.generate(prompt, **kwargs)).content
        for word in full.split():
            await asyncio.sleep(0.02)
            yield LLMStreamChunk(delta=word + " ")
        yield LLMStreamChunk(delta="", is_final=True, response=...)
```

Useful for deterministic tests and for `APP_ENV=development` without an API key.

### Factory

```python
def get_provider(name: str | None = None) -> LLMProvider:
    name = name or settings.default_llm_provider
    match name:
        case "anthropic":
            return AnthropicProvider(api_key=settings.anthropic_api_key)
        case "openai":
            return OpenAIProvider(api_key=settings.openai_api_key)
        case "mock":
            return MockProvider()
        case _:
            raise ValueError(f"Unknown provider: {name}")
```

Injected via FastAPI dependency:

```python
def get_llm_provider() -> LLMProvider:
    return get_provider()

# in endpoints
async def my_endpoint(llm: Annotated[LLMProvider, Depends(get_llm_provider)]):
    ...
```

### Fallback

Optional wrapper `FallbackProvider`:

```python
class FallbackProvider:
    def __init__(self, primary: LLMProvider, fallback: LLMProvider):
        self._primary = primary
        self._fallback = fallback

    async def generate(self, *args, **kwargs):
        try:
            return await self._primary.generate(*args, **kwargs)
        except (RateLimitError, APIError) as e:
            logger.warning("primary_provider_failed", error=str(e), falling_back=self._fallback.name)
            return await self._fallback.generate(*args, **kwargs)
```

Note: do NOT enable fallback by default (it can hide bugs). Only enable if `ENABLE_LLM_FALLBACK=true`.

## Prompts

### Registry

`backend/src/ai/prompts/registry.py`:

```python
class PromptRegistry:
    def __init__(self, base_path: Path):
        self._base = base_path
        self._cache: dict[str, str] = {}

    def get(self, name: str, version: int = 1) -> str:
        key = f"{name}.v{version}"
        if key not in self._cache:
            path = self._base / f"{key}.md"
            self._cache[key] = path.read_text()
        return self._cache[key]

    def render(self, name: str, version: int = 1, **vars) -> str:
        template = self.get(name, version)
        return template.format(**vars)


registry = PromptRegistry(Path(__file__).parent / "templates")
```

### Initial templates

**`headline_generation.v1.md`**

```markdown
You are a senior copywriter at a global advertising agency.

Generate a compelling, concise advertising headline for the following campaign.

# Campaign brief
{brief}

# Content piece
- Type: {content_type}
- Target language: {language}
- Tone: persuasive but not pushy

# Constraints
- Maximum 12 words.
- Must work as a standalone hook.
- Avoid clichés.

Return ONLY the headline, no explanations, no quotes.
```

**`translation.v1.md`**

```markdown
You are a professional translator specialized in marketing copy.

Translate the following text from {source_language} to {target_language}.
Preserve tone, intent, and brevity. Localize idioms naturally.

# Text
{text}

Return ONLY the translation, no explanations.
```

**`metadata_extraction.v1.md`**

```markdown
Analyze the following marketing copy and extract structured metadata.

# Text
{text}

Return a JSON object with these fields:
- sentiment: one of ["positive", "neutral", "negative"]
- tone: one of ["formal", "casual", "playful", "urgent", "aspirational"]
- keywords: array of 3-7 relevant keywords (lowercase)
- estimated_reading_time_seconds: integer
```

### Prompt versioning in DB (optional but recommended)

When a draft is generated, persist `prompt_template_id` (FK to the `prompt_template` table) **in addition to** keeping the file. This allows reproducing exactly which version was used.

For MVP: file-based versioning with `.v1.md`, `.v2.md` suffixes. DB migration is a seed that inserts the file contents.

## Costs

`backend/src/ai/costs.py`:

```python
# prices in USD per 1M tokens (verify against current published pricing)
PRICING = {
    "claude-3-5-sonnet-20241022": (3.00, 15.00),    # in, out
    "claude-3-5-haiku-20241022": (1.00, 5.00),
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
    "mock-model-v1": (0.0, 0.0),
}


def estimate_cost(model: str, tokens_in: int, tokens_out: int) -> float:
    in_price, out_price = PRICING.get(model, (0.0, 0.0))
    return round((tokens_in * in_price + tokens_out * out_price) / 1_000_000, 6)
```

> ⚠️ Validate current pricing before final delivery, official prices change frequently. Otherwise, add a disclaimer in README: "prices are reference values at the time of development".

## Observability

Every provider call should be logged with `structlog`:

```python
logger.info(
    "llm_call",
    provider=response.provider,
    model=response.model,
    tokens_in=response.tokens_in,
    tokens_out=response.tokens_out,
    latency_ms=response.latency_ms,
    cost_usd=response.cost_usd,
    prompt_preview=prompt[:100],
)
```

## Tests

### Unit (tests/ai/)

- `test_anthropic_provider_generate`: mock the client with `respx` or `unittest.mock`, assert `LLMResponse` is well-built.
- `test_anthropic_provider_handles_rate_limit`: on 429, raise our custom exception.
- `test_openai_provider_*`: same.
- `test_mock_provider_returns_fixtures`: instantiate with `{"hello": "Hi there!"}`, assert.
- `test_factory_returns_correct_provider`: feed `"anthropic"`, get `AnthropicProvider`.
- `test_fallback_on_primary_error`: primary raises, fallback responds, assert fallback's output.
- `test_estimate_cost`: claude-3-5-sonnet 1000/500 = $0.0105 (verify).
- `test_prompt_registry_renders`: `registry.render("headline_generation", brief="X", ...)` returns string with values.
- `test_prompt_registry_missing_version_raises`: `registry.get("foo", 99)` → `FileNotFoundError`.

### Integration (optional, gated by env var)

`pytest.mark.real_llm` — only runs if `RUN_REAL_LLM_TESTS=1`. Executes real calls with trivial prompts. NEVER in CI.

## Acceptance criteria

- [ ] `python -c "from src.ai.providers.factory import get_provider; p = get_provider('mock'); print(p.name)"` prints `mock`.
- [ ] Test suite passes with > 80% coverage on `src/ai/`.
- [ ] Manual call to the real Anthropic provider (script or REPL) generates and logs correctly.
- [ ] Prompt registry loads the 4 initial templates without error.
- [ ] Mock provider streams correctly and respects `is_final` on the last chunk.

## Suggested commit plan

```
feat(ai): define LLMProvider protocol and dataclasses
feat(ai): implement anthropic provider with structured outputs
feat(ai): implement openai provider with structured outputs
feat(ai): implement mock provider for tests
feat(ai): add provider factory with env-driven default
feat(ai): add prompt registry and v1 templates
feat(ai): add cost estimation helper
test(ai): provider abstractions and fallback behavior
test(ai): prompt registry rendering
docs(adr): 0003 langgraph over plain langchain
```

## Trade-offs and decisions to document (ADR if applicable)

- **Why Protocol and not abstract base class?** Duck typing, less boilerplate, better for injection.
- **Why three methods (`generate`, `generate_stream`, `generate_structured`) and not one with flags?** Each has a fundamentally different return shape. Better to be explicit.
- **Why prompts in `.md` files and not YAML/JSON?** `.md` is human-readable, supports natural multi-line, git-friendly. YAML/JSON hurt readability.
- **Why not use LangChain `ChatPromptTemplate` for all prompts?** Overkill for simple prompts. For graph prompts (spec 04) we do use them. Keep both: registry for direct prompts, LangChain for graph prompts.

## Notes

- **Do not read API keys with `os.environ` from inside the provider.** They come via constructor. Maintains testability.
- **Do not silence SDK exceptions.** Re-raise as ours (`AIProviderError`, `AIRateLimitError`).
- **Deterministic mock provider**: if your test depends on exact output, pass it fixtures. Never assume behavior without a fixture.
- Anthropic `tool_use` has a quirk: the model sometimes returns a text block before the tool_use. Iterate over `msg.content` and filter.
