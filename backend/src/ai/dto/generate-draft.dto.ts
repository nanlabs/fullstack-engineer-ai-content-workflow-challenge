import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AIModel } from '@prisma/client';

export class GenerateDraftDto {
  @IsOptional()
  @IsEnum(AIModel)
  model?: AIModel;

  @IsOptional()
  @IsString()
  prompt?: string;
}
