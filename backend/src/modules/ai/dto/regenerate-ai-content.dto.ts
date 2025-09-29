import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class RegenerateAiContentDto {
  @ApiProperty({ 
    example: 'Make it more professional and add specific examples with data and statistics. Also include more technical details about AI implementation.',
    description: 'Feedback or instructions for improving the content'
  })
  @IsString()
  @MinLength(10)
  feedback: string;

  @ApiPropertyOptional({ 
    example: 'gpt-4',
    description: 'AI model to use for regeneration' 
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
