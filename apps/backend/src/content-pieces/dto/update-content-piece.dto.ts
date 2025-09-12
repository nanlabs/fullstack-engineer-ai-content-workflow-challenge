import { PartialType } from '@nestjs/mapped-types';
import { CreateContentPieceDto } from './create-content-piece.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewState } from '../review-state.enum';

export class UpdateContentPieceDto extends PartialType(CreateContentPieceDto) {
  @ApiProperty({
    description: 'The review state of the content piece',
    example: 'Reviewed',
    enum: ReviewState,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReviewState)
  reviewState?: ReviewState;
}
