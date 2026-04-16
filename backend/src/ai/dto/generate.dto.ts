import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ProviderChoice = 'openai' | 'anthropic' | 'both';

export class GenerateDto {
  @ApiProperty({
    enum: ['openai', 'anthropic', 'both'],
    example: 'openai',
    description: 'AI provider to use. "both" runs OpenAI and Anthropic in parallel for comparison.',
  })
  @IsEnum(['openai', 'anthropic', 'both'] as const)
  provider!: ProviderChoice;

  @ApiPropertyOptional({ example: 'professional', description: 'Desired tone of the content' })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional({ example: 'concise', description: 'Desired writing style' })
  @IsOptional()
  @IsString()
  style?: string;
}
