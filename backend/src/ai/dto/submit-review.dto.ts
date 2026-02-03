import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewDecision } from '../review-decision.enum';

export class SubmitReviewDto {
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  editedText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
