# AI Design — ModelFactory & LangGraph

## ModelFactory Pattern

The `ModelFactory` service provides a provider-agnostic abstraction layer for LLM interactions. Rather than coupling business logic to a specific provider's SDK, all AI operations go through a uniform interface.

### Design Principles

1. **Environment-driven discovery** — At startup, the factory scans for API keys and registers only available providers. No hardcoded provider lists.
2. **Configurable default** — `DEFAULT_LLM_PROVIDER` env var sets the system-wide default. All endpoints use it unless overridden.
3. **Per-request override** — Any AI endpoint accepts an optional `model` body parameter to use a different provider for that specific call.
4. **Comparison mode** — The `/compare` endpoint runs the same prompt through all available providers in parallel, letting users evaluate output quality.

### Provider Registry

```typescript
// Each provider maps to an env key and a factory function
const PROVIDERS = {
  openai:    { envKey: 'OPENAI_API_KEY',    factory: (key) => new ChatOpenAI({...}) },
  anthropic: { envKey: 'ANTHROPIC_API_KEY',  factory: (key) => new ChatAnthropic({...}) },
  gemini:    { envKey: 'GOOGLE_API_KEY',     factory: (key) => new ChatGoogleGenerativeAI({...}) },
};
```

### Adding a New Provider

1. Install the LangChain package (`@langchain/xxx`)
2. Add an entry to the `PROVIDERS` map
3. Add the env key to `.env.example`
4. Done — no other code changes needed

## LangGraph Workflow

The content pipeline is implemented as a LangGraph `StateGraph`:

```
START → generate → translate → extract → END
```

### State Schema

```typescript
{
  contentPiece: ContentPiece,      // The source content piece
  campaign: Campaign,              // Parent campaign (for target languages)
  model: ChatModel,                // The LLM model to use
  generatedBody: string,           // Output from generate step
  translations: Translation[],     // Output from translate step
  metadata: Metadata,              // Output from extract step
}
```

### Why LangGraph over Imperative Chains?

| Aspect | Imperative Chain | LangGraph |
|--------|-----------------|-----------|
| Visibility | Code flow | Visual graph |
| Error handling | Try/catch nesting | Per-node error boundaries |
| State management | Manual passing | Annotation-based |
| Human-in-the-loop | Manual interrupts | Built-in breakpoints |
| Branching | If/else | Conditional edges |

The pipeline currently runs linearly, but the LangGraph structure makes it trivial to add:
- **Conditional routing** — Skip translation if no target languages
- **Human checkpoints** — Pause after generation for review before translation
- **Parallel fan-out** — Translate to all languages simultaneously
- **Retry with backoff** — Per-node retry policies

## Prompt Engineering

All prompts are defined as `ChatPromptTemplate` objects in `prompts.ts`:

- **Generate**: Takes content type, title, campaign context → produces marketing copy
- **Translate**: Takes body, source language, target language → produces localized translation (not literal)
- **Extract**: Takes body → produces structured JSON with keywords, tone, sentiment, readability

Templates use LangChain's variable interpolation and are piped directly to models via `prompt.pipe(model)`.
