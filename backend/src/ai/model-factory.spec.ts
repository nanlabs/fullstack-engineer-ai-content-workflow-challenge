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
      DEFAULT_LLM_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-test',
      GOOGLE_API_KEY: 'goog-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    expect(factory.getAvailableProviders()).toEqual(['openai', 'gemini']);
    expect(factory.getDefaultProvider()).toBe('openai');
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
      DEFAULT_LLM_PROVIDER: 'anthropic',
      OPENAI_API_KEY: 'sk-test',
    });

    const factory = new ModelFactory(config);
    expect(() => factory.onModuleInit()).toThrow(
      'Default provider "anthropic" is not available',
    );
  });

  it('getModel returns the requested provider', () => {
    const config = createConfigService({
      DEFAULT_LLM_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-test',
      GOOGLE_API_KEY: 'goog-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    const model = factory.getModel('gemini');
    expect(model).toBeDefined();
  });

  it('getModel without argument returns default', () => {
    const config = createConfigService({
      DEFAULT_LLM_PROVIDER: 'gemini',
      GOOGLE_API_KEY: 'goog-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    const model = factory.getModel();
    expect(model).toBeDefined();
  });

  it('getModel throws for unavailable provider', () => {
    const config = createConfigService({
      DEFAULT_LLM_PROVIDER: 'gemini',
      GOOGLE_API_KEY: 'goog-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    expect(() => factory.getModel('openai')).toThrow(
      'Provider "openai" is not available',
    );
  });

  it('defaults to gemini when DEFAULT_LLM_PROVIDER not set', () => {
    const config = createConfigService({
      GOOGLE_API_KEY: 'goog-test',
    });

    const factory = new ModelFactory(config);
    factory.onModuleInit();

    expect(factory.getDefaultProvider()).toBe('gemini');
  });
});
