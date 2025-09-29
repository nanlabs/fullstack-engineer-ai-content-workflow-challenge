import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class GenerateTranslationDto {
  @ApiProperty({ 
    example: 'Spanish',
    description: 'Target language name (e.g., Spanish, French, German, Portuguese)' 
  })
  @IsString()
  @MinLength(2)
  language: string;

  @ApiPropertyOptional({ 
    example: 'Argentina - Buenos Aires market, casual tone, use "vos" instead of "tú"',
    description: 'Additional context for localization (country, region, tone, cultural notes)' 
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ 
    example: 'gpt-3.5-turbo' 
  })
  @IsOptional()
  @IsString()
  aiModelUsed?: string;
}
