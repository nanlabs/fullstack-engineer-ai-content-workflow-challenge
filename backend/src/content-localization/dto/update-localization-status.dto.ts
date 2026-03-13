import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReviewStatus } from '../../status-enum';

export class UpdateLocalizationStatusDto {
  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.REVIEWED })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}
