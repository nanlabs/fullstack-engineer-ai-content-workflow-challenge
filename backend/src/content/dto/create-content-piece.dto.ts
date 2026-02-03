import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ContentType } from '../content-type.enum';
import { ReviewState } from '../review-state.enum';

export class CreateContentPieceDto {
  @IsEnum(ContentType)
  type: ContentType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  originalText: string;

  @IsOptional()
  @IsString()
  aiDraft?: string;

  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @IsOptional()
  @IsEnum(ReviewState)
  reviewState?: ReviewState;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
