import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveDraftDto {
  @ApiPropertyOptional({ description: 'Human-edited version of the generated text' })
  @IsOptional()
  @IsString()
  editedText?: string;
}

export class RejectDraftDto {
  @ApiPropertyOptional({ description: 'Reason for rejection / reviewer feedback' })
  @IsOptional()
  @IsString()
  reviewerNotes?: string;
}
