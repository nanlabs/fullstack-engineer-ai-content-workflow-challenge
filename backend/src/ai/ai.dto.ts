import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AiGenerateDto {
  @IsString()
  @IsOptional()
  model?: string;
}

export class AiTranslateDto {
  @IsString()
  @MaxLength(10)
  targetLanguage!: string;

  @IsString()
  @IsOptional()
  model?: string;
}

export class AiChainDto {
  @IsString()
  @IsOptional()
  model?: string;
}

export class AiCompareDto {}
