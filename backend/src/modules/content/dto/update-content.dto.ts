import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, ContentType } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MinLength,
} from 'class-validator';

export class UpdateContentDto {
  @ApiPropertyOptional({ example: 'Summer Product Launch Post' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({ enum: ContentType, example: ContentType.SOCIAL_POST })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({ example: 'Check out our amazing summer products!' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: ContentStatus, example: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @ApiPropertyOptional({ example: 'Create a social media post about summer products' })
  @IsOptional()
  @IsString()
  promptUsed?: string;

  @ApiPropertyOptional({ example: 'gpt-4' })
  @IsOptional()
  @IsString()
  aiModelUsed?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  tokensUsed?: number;
}
