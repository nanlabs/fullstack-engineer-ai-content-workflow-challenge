import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, MinLength } from 'class-validator';

export class GenerateTranslationsDto {
  @ApiProperty({ 
    example: ['es', 'fr', 'de'],
    description: 'Array of language codes to translate to' 
  })
  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @ApiPropertyOptional({ example: 'gpt-4' })
  @IsString()
  @MinLength(1)
  aiModelUsed?: string;
}
