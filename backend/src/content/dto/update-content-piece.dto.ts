import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

export class UpdateContentPieceDto {
  @ApiPropertyOptional({ enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originalText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;
}
