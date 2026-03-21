import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';

export class CreateContentPieceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  body?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  language?: string;
}

export class UpdateContentPieceDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  body?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  reviewNotes?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: ['DRAFT', 'AI_SUGGESTED', 'REVIEWED', 'APPROVED', 'REJECTED'] })
  @IsEnum(ContentStatus)
  status!: ContentStatus;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  reviewNotes?: string;
}
