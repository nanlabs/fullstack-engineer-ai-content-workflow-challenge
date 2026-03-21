import { plainToInstance } from 'class-transformer';
import { IsEnum, IsOptional, IsString, validateSync } from 'class-validator';

enum LlmProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
}

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

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
  [LlmProvider.OPENAI]: 'OPENAI_API_KEY',
  [LlmProvider.ANTHROPIC]: 'ANTHROPIC_API_KEY',
  [LlmProvider.GEMINI]: 'GOOGLE_API_KEY',
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
