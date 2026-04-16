import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer 2026 Product Launch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Global launch campaign for eco-friendly products.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['es', 'fr', 'de'], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLanguages?: string[];

  @ApiPropertyOptional({ example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  sourceLanguage?: string;
}
