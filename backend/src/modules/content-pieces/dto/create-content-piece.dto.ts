import { IsString, IsOptional } from 'class-validator';

export class CreateContentPieceDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  contentType: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsString()
  campaignId: string;
}
