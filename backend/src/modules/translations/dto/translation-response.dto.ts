import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TranslationStatus } from '@prisma/client';

export class TranslationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  contentPieceId: string;

  @ApiProperty()
  language: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: TranslationStatus })
  status: TranslationStatus;

  @ApiPropertyOptional()
  aiModelUsed?: string;

  @ApiPropertyOptional()
  tokensUsed?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  contentPiece?: {
    id: string;
    title: string;
    type: string;
    content: string;
  };
}
