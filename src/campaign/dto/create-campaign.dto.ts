import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer campaign for skincare products' })
  @IsString()
  @MinLength(2)
  topic: string;

  @ApiPropertyOptional({ example: 'Targeting LATAM markets' })
  @IsOptional()
  @IsString()
  description?: string;
}
