import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateAiDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  tone?: string;
}
