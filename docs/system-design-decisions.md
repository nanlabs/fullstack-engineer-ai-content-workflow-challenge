# Design Decisions

## Why Redis?

Redis is used to manage asynchronous background jobs. AI generation tasks can be slow, so they are processed outside the HTTP request lifecycle.

## Why WebSockets?

WebSockets allow real-time updates of campaign progress without polling. This improves the user experience by providing live feedback while the campaign is being generated.

## Why multiple AI providers?

The system supports multiple AI providers such as OpenAI and Anthropic. This allows model selection, provider redundancy, and future extensibility.

## Why localization generation?

Marketing campaigns often require localized content for different markets and languages. The system generates localized versions of campaign pieces automatically.

## Why LangChain?

LangChain is used to standardize interactions with multiple LLM providers such as OpenAI and Anthropic.

It provides:

- A unified interface for different AI models
- Prompt management
- Easier provider switching
- Structured output handling

This abstraction allows the system to support multiple AI providers without tightly coupling the business logic to a specific LLM implementation.