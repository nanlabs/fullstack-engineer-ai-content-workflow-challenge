import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '@prisma/client';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer 2024 Campaign' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({ example: 'Our summer product launch campaign' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    enum: CampaignStatus, 
    example: CampaignStatus.DRAFT,
    description: 'Campaign status (DRAFT, ACTIVE, COMPLETED, ARCHIVED)' 
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
