import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ContentStatus } from '@prisma/client';

export class ReviewContentDto {
  @IsEnum(ContentStatus)
  status: ContentStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
