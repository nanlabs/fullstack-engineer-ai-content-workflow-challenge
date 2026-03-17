import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer campaign for skincare products' })
  @IsString()
  @MinLength(2)
  topic: string;

  @ApiPropertyOptional({ example: 'Targeting LATAM markets' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ['en-US', 'es-ES', 'fr-FR'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-z]{2,3}-[A-Z]{2}$/, {
    each: true,
    message:
      'Each localization must use locale format like en-US, es-MX, fr-FR (language-country).',
  })
  languages: string[];

  @ApiProperty({ example: 'openai' })
  @IsString()
  @MinLength(2)
  provider: string;

  @ApiProperty({ example: 'gpt-4o-mini' })
  @IsString()
  @MinLength(2)
  model: string;
}
