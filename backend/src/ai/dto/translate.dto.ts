import { IsArray, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TranslateDto {
  @ApiProperty({
    example: ['es', 'fr'],
    description: 'ISO 639-1 language codes to translate to',
  })
  @IsArray()
  @IsString({ each: true })
  targetLanguages!: string[];

  @ApiProperty({ enum: ['openai', 'anthropic'], example: 'openai' })
  @IsEnum(['openai', 'anthropic'] as const)
  provider!: 'openai' | 'anthropic';
}
