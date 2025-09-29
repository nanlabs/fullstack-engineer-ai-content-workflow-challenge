import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateContentStatusDto {
  @ApiProperty({ enum: ContentStatus, example: ContentStatus.REVIEW })
  @IsEnum(ContentStatus)
  status: ContentStatus;
}
