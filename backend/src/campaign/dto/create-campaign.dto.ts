import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer campaign for skincare products' })
  @IsString()
  @MinLength(2)
  topic: string;

  @ApiPropertyOptional({ example: 'Targeting LATAM markets' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ['en', 'es', 'pt'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
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
