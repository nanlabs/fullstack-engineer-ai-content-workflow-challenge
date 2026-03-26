import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_SECRET: 'super-secret',
    DEFAULT_LLM_PROVIDER: 'gpt-5.4-mini',
    OPENAI_API_KEY: 'sk-test-key',
  };

  it('passes with valid configuration', () => {
    const result = validateEnv(validConfig);
    expect(result).toBeDefined();
    expect(result.DATABASE_URL).toBe(validConfig.DATABASE_URL);
  });

  it('throws when DATABASE_URL is missing', () => {
    const { DATABASE_URL, ...config } = validConfig;
    expect(() => validateEnv(config)).toThrow();
  });

  it('throws when JWT_SECRET is missing', () => {
    const { JWT_SECRET, ...config } = validConfig;
    expect(() => validateEnv(config)).toThrow();
  });

  it('throws when DEFAULT_LLM_PROVIDER is missing', () => {
    const { DEFAULT_LLM_PROVIDER, ...config } = validConfig;
    expect(() => validateEnv(config)).toThrow();
  });

  it('throws when DEFAULT_LLM_PROVIDER is invalid', () => {
    expect(() =>
      validateEnv({ ...validConfig, DEFAULT_LLM_PROVIDER: 'invalid-provider' }),
    ).toThrow();
  });

  it('throws when default provider API key is not set', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'secret',
        DEFAULT_LLM_PROVIDER: 'claude-sonnet-4.6',
        OPENAI_API_KEY: 'sk-test', // OpenAI key, but default is Anthropic
      }),
    ).toThrow('ANTHROPIC_API_KEY is not set');
  });

  it('throws when no LLM provider API keys are set', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'secret',
        DEFAULT_LLM_PROVIDER: 'gpt-5.4-mini',
      }),
    ).toThrow();
  });

  it('accepts all valid provider names', () => {
    const providers = [
      { name: 'gpt-5.4-mini', key: 'OPENAI_API_KEY' },
      { name: 'gpt-5.4', key: 'OPENAI_API_KEY' },
      { name: 'claude-sonnet-4.6', key: 'ANTHROPIC_API_KEY' },
      { name: 'claude-haiku-4.5', key: 'ANTHROPIC_API_KEY' },
      { name: 'gemini-2.5-flash-lite', key: 'GOOGLE_API_KEY' },
      { name: 'gemini-flash-2.5', key: 'GOOGLE_API_KEY' },
    ];

    for (const { name, key } of providers) {
      expect(() =>
        validateEnv({
          DATABASE_URL: 'postgresql://localhost/test',
          JWT_SECRET: 'secret',
          DEFAULT_LLM_PROVIDER: name,
          [key]: 'test-key',
        }),
      ).not.toThrow();
    }
  });

  it('allows optional fields to be omitted', () => {
    const result = validateEnv(validConfig);
    expect(result).toBeDefined();
    // JWT_EXPIRATION, FRONTEND_URL, PORT are all optional
  });
});
