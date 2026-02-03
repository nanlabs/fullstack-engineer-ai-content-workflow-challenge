import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CampaignStatus } from '../campaign-status.enum';

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLanguages?: string[];
}
