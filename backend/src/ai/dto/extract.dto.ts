import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExtractDto {
  @ApiPropertyOptional({ enum: ['openai', 'anthropic'], example: 'openai' })
  @IsOptional()
  @IsEnum(['openai', 'anthropic'] as const)
  provider?: 'openai' | 'anthropic';
}
