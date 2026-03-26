import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ModelFactory } from './model-factory.service';

// Mock LangChain providers to avoid real API calls
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({ _type: 'openai' })),
}));
jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn().mockImplementation(() => ({ _type: 'anthropic' })),
}));
jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({ _type: 'gemini' })),
}));

function createConfigService(env: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string, fallback?: string) => env[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('ModelFactory', () => {
  it('registers providers that have API keys', async () => {
    const config = createConfigService({
      DEFAULT_LLM_PROVIDER: 'gpt-5.4-mini',
      OPENAI_API_KEY: 'sk-test',
      GOOGLE_API_KEY: 'goog-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    expect(factory.getAvailableProviders()).toEqual([
      'gpt-5.4-mini', 'gpt-5.4', 'gemini-2.5-flash-lite', 'gemini-flash-2.5',
    ]);
    expect(factory.getDefaultProvider()).toBe('gpt-5.4-mini');
  });

  it('throws when no providers available', () => {
    const config = createConfigService({
      DEFAULT_LLM_PROVIDER: 'openai',
    });

    const factory = new ModelFactory(config);
    expect(() => factory.onModuleInit()).toThrow('No LLM providers available');
  });

  it('throws when default provider is not available', () => {
    const config = createConfigService({
      DEFAULT_LLM_PROVIDER: 'claude-sonnet-4.6',
      OPENAI_API_KEY: 'sk-test',
    });

    const factory = new ModelFactory(config);
    expect(() => factory.onModuleInit()).toThrow(
      'Default provider "claude-sonnet-4.6" is not available',
    );
  });

  it('getModel returns the requested provider', () => {
    const config = createConfigService({
      DEFAULT_LLM_PROVIDER: 'gpt-5.4-mini',
      OPENAI_API_KEY: 'sk-test',
      GOOGLE_API_KEY: 'goog-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    const model = factory.getModel('gemini-2.5-flash-lite');
    expect(model).toBeDefined();
  });

  it('getModel without argument returns default', () => {
    const config = createConfigService({
      DEFAULT_LLM_PROVIDER: 'gemini-flash-2.5',
      GOOGLE_API_KEY: 'goog-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    const model = factory.getModel();
    expect(model).toBeDefined();
  });

  it('getModel throws for unavailable provider', () => {
    const config = createConfigService({
      DEFAULT_LLM_PROVIDER: 'gemini-flash-2.5',
      GOOGLE_API_KEY: 'goog-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    expect(() => factory.getModel('gpt-5.4-mini')).toThrow(
      'Provider "gpt-5.4-mini" is not available',
    );
  });

  it('defaults to gpt-5.4-mini when DEFAULT_LLM_PROVIDER not set', () => {
    const config = createConfigService({
      OPENAI_API_KEY: 'sk-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    expect(factory.getDefaultProvider()).toBe('gpt-5.4-mini');
  });
});
