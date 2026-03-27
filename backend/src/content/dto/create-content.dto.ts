import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ContentType } from '@prisma/client';

export class CreateContentDto {
  @IsEnum(ContentType)
  type: ContentType;

  @IsString()
  @MinLength(1)
  originalText: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
