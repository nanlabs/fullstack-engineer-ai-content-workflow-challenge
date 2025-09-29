import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class RegenerateTranslationDto {
  @ApiProperty({ 
    example: 'The translation sounds too formal for our target audience. Make it more colloquial and use expressions that young people in Argentina would use.',
    description: 'Feedback or instructions for improving the translation'
  })
  @IsString()
  @MinLength(10)
  feedback: string;

  @ApiPropertyOptional({ 
    example: 'gpt-3.5-turbo' 
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether to keep the previous attempt in history',
    default: true
  })
  @IsOptional()
  keepHistory?: boolean;
}
