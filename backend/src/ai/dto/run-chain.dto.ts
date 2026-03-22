import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AIModel } from '@prisma/client';

export class RunChainDto {
  @IsString()
  targetLanguage: string;

  @IsOptional()
  @IsEnum(AIModel)
  model?: AIModel;
}
