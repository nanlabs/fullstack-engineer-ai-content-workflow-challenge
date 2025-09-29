import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, ContentType } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  MinLength,
} from 'class-validator';

export class CreateContentDto {
  @ApiProperty({ example: 'uuid-of-campaign' })
  @IsUUID()
  campaignId: string;

  @ApiProperty({ example: 'Summer Product Launch Post' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ 
    enum: ContentType, 
    example: ContentType.SOCIAL_POST,
    description: 'Content type (SOCIAL_POST, EMAIL_SUBJECT, EMAIL_BODY, PRODUCT_DESCRIPTION, BLOG_POST, AD_COPY, AD_HEADLINE)' 
  })
  @IsEnum(ContentType)
  type: ContentType;

  @ApiPropertyOptional({ example: 'Check out our amazing summer products!' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ 
    enum: ContentStatus, 
    example: ContentStatus.DRAFT,
    description: 'Content status (DRAFT, AI_GENERATED, REVIEW, APPROVED, REJECTED)' 
  })
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
