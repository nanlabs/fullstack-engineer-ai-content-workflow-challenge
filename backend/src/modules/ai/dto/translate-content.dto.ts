import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class TranslateContentDto {
  @ApiProperty({ 
    example: '🌟 Exciting news! Our summer collection is here! ✨ #NewLaunch #ExcitingNews' 
  })
  @IsString()
  content: string;

  @ApiProperty({ 
    example: 'Spanish',
    description: 'Target language name (e.g., Spanish, French, German)' 
  })
  @IsString()
  targetLanguage: string;

  @ApiPropertyOptional({ 
    example: 'Argentina - casual tone, use "vos" instead of "tú"',
    description: 'Additional context for localization' 
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ 
    example: 'en' 
  })
  @IsOptional()
  @IsString()
  sourceLanguage?: string;

  @ApiPropertyOptional({ 
    example: 'gpt-3.5-turbo' 
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ 
    example: 1000 
  })
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional({ 
    example: 0.3 
  })
  @IsOptional()
  temperature?: number;
}
