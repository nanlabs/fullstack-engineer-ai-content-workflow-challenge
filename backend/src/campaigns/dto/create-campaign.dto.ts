import { IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLangs?: string[];
}
