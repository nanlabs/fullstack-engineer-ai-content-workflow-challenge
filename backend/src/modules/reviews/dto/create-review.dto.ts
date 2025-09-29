import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ 
    enum: ReviewStatus, 
    example: ReviewStatus.PENDING,
    description: 'Review status (PENDING, APPROVED, REJECTED, CHANGES_REQUESTED)' 
  })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @ApiPropertyOptional({ example: 'Great content! Just needs minor adjustments.' })
  @IsOptional()
  @IsString()
  comments?: string;
}
