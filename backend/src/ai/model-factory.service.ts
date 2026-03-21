import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

type ChatModel = ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

interface ProviderConfig {
  envKey: string;
  factory: (apiKey: string) => ChatModel;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  'gpt-5.4-mini': {
    envKey: 'OPENAI_API_KEY',
    factory: (apiKey) =>
      new ChatOpenAI({ openAIApiKey: apiKey, modelName: 'gpt-5.4-mini', temperature: 0.7, maxRetries: 2, timeout: 30000 }),
  },
  'gpt-5.4': {
    envKey: 'OPENAI_API_KEY',
    factory: (apiKey) =>
      new ChatOpenAI({ openAIApiKey: apiKey, modelName: 'gpt-5.4', temperature: 0.7, maxRetries: 2, timeout: 30000 }),
  },
  'claude-sonnet-4.6': {
    envKey: 'ANTHROPIC_API_KEY',
    factory: (apiKey) =>
      new ChatAnthropic({ anthropicApiKey: apiKey, modelName: 'claude-sonnet-4.6', temperature: 0.7, maxRetries: 2 }),
  },
  'claude-haiku-4.5': {
    envKey: 'ANTHROPIC_API_KEY',
    factory: (apiKey) =>
      new ChatAnthropic({ anthropicApiKey: apiKey, modelName: 'claude-haiku-4.5', temperature: 0.7, maxRetries: 2 }),
  },
  'gemini-2.5-flash-lite': {
    envKey: 'GOOGLE_API_KEY',
    factory: (apiKey) =>
      new ChatGoogleGenerativeAI({ apiKey, modelName: 'gemini-2.5-flash-lite', temperature: 0.7, maxRetries: 2 }),
  },
  'gemini-flash-2.5': {
    envKey: 'GOOGLE_API_KEY',
    factory: (apiKey) =>
      new ChatGoogleGenerativeAI({ apiKey, modelName: 'gemini-2.5-flash', temperature: 0.7, maxRetries: 2 }),
  },
};

@Injectable()
export class ModelFactory implements OnModuleInit {
  private readonly logger = new Logger(ModelFactory.name);
  private readonly models = new Map<string, ChatModel>();
  private available: string[] = [];
  private defaultProvider: string;

  constructor(private readonly config: ConfigService) {
    this.defaultProvider = this.config.get<string>('DEFAULT_LLM_PROVIDER', 'gpt-5.4-mini');
  }

  onModuleInit() {
    for (const [name, cfg] of Object.entries(PROVIDERS)) {
      const key = this.config.get<string>(cfg.envKey);
      if (key) {
        this.models.set(name, cfg.factory(key));
        this.available.push(name);
        this.logger.log(`LLM provider registered: ${name}`);
      }
    }

    if (this.available.length === 0) {
      throw new Error('No LLM providers available. Set at least one API key.');
    }

    if (!this.models.has(this.defaultProvider)) {
      throw new Error(
        `Default provider "${this.defaultProvider}" is not available. Available: ${this.available.join(', ')}`,
      );
    }

    this.logger.log(`Default LLM provider: ${this.defaultProvider}`);
  }

  getModel(provider?: string): ChatModel {
    const name = provider ?? this.defaultProvider;
    const model = this.models.get(name);
    if (!model) {
      throw new Error(
        `Provider "${name}" is not available. Available: ${this.available.join(', ')}`,
      );
    }
    return model;
  }

  getAvailableProviders(): string[] {
    return [...this.available];
  }

  getDefaultProvider(): string {
    return this.defaultProvider;
  }

  getAllProviders(): string[] {
    return Object.keys(PROVIDERS);
  }
}
