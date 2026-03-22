import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AIModel } from '@prisma/client';

export class TranslateContentDto {
  @IsString()
  @MinLength(2)
  targetLanguage: string;

  @IsOptional()
  @IsEnum(AIModel)
  model?: AIModel;
}
