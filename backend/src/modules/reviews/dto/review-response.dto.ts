import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  contentPieceId: string;

  @ApiProperty()
  reviewerId: string;

  @ApiProperty({ enum: ReviewStatus })
  status: ReviewStatus;

  @ApiPropertyOptional()
  comments?: string;

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  contentPiece?: {
    id: string;
    title: string;
    type: string;
    status: string;
  };

  @ApiPropertyOptional()
  reviewer?: {
    id: string;
    name: string;
    email: string;
  };
}
