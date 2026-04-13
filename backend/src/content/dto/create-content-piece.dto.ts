import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

export class CreateContentPieceDto {
  @ApiProperty({ enum: ContentType, example: 'headline' })
  @IsEnum(ContentType)
  @IsNotEmpty()
  type!: ContentType;

  @ApiPropertyOptional({ example: 'Introducing our new product line' })
  @IsOptional()
  @IsString()
  originalText?: string;

  @ApiPropertyOptional({ example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;
}
