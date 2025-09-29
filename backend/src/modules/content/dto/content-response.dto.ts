import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, ContentType } from '@prisma/client';

export class ContentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  campaignId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ContentType })
  type: ContentType;

  @ApiPropertyOptional()
  content?: string;

  @ApiProperty({ enum: ContentStatus })
  status: ContentStatus;

  @ApiProperty()
  language: string;

  @ApiProperty()
  aiGenerated: boolean;

  @ApiPropertyOptional()
  promptUsed?: string;

  @ApiPropertyOptional()
  aiModelUsed?: string;

  @ApiPropertyOptional()
  tokensUsed?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  campaign?: {
    id: string;
    name: string;
    status: string;
  };

  @ApiPropertyOptional()
  reviews?: any[];

  @ApiPropertyOptional()
  translations?: any[];
}
