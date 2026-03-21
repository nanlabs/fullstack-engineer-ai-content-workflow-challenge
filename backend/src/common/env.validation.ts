import { plainToInstance } from 'class-transformer';
import { IsEnum, IsOptional, IsString, validateSync } from 'class-validator';

enum LlmProvider {
  GPT_5_4_MINI = 'gpt-5.4-mini',
  GPT_5_4 = 'gpt-5.4',
  CLAUDE_SONNET = 'claude-sonnet-4.6',
  CLAUDE_HAIKU = 'claude-haiku-4.5',
  GEMINI_PRO = 'gemini-pro-3.1',
  GEMINI_FLASH = 'gemini-flash-2.5',
}

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION?: string;

  @IsEnum(LlmProvider)
  DEFAULT_LLM_PROVIDER!: LlmProvider;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  ANTHROPIC_API_KEY?: string;

  @IsString()
  @IsOptional()
  GOOGLE_API_KEY?: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsString()
  @IsOptional()
  PORT?: string;
}

const PROVIDER_KEY_MAP: Record<LlmProvider, string> = {
  [LlmProvider.GPT_5_4_MINI]: 'OPENAI_API_KEY',
  [LlmProvider.GPT_5_4]: 'OPENAI_API_KEY',
  [LlmProvider.CLAUDE_SONNET]: 'ANTHROPIC_API_KEY',
  [LlmProvider.CLAUDE_HAIKU]: 'ANTHROPIC_API_KEY',
  [LlmProvider.GEMINI_PRO]: 'GOOGLE_API_KEY',
  [LlmProvider.GEMINI_FLASH]: 'GOOGLE_API_KEY',
};

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.toString()}`);
  }

  // Ensure the default provider has its API key set
  const defaultProvider = validated.DEFAULT_LLM_PROVIDER;
  const requiredKey = PROVIDER_KEY_MAP[defaultProvider];
  if (!validated[requiredKey as keyof EnvironmentVariables]) {
    throw new Error(
      `DEFAULT_LLM_PROVIDER is set to "${defaultProvider}" but ${requiredKey} is not set`,
    );
  }

  // Ensure at least one provider key is set
  const hasAnyKey = Object.values(PROVIDER_KEY_MAP).some(
    (key) => !!validated[key as keyof EnvironmentVariables],
  );
  if (!hasAnyKey) {
    throw new Error('At least one LLM provider API key must be set');
  }

  return validated;
}
