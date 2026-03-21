import { IsOptional, IsString, IsArray, IsInt, Min, Max, MaxLength } from 'class-validator';

export class AiGenerateDto {
  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  prompt?: string;

  @IsInt()
  @Min(10)
  @Max(10000)
  @IsOptional()
  wordCount?: number;
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

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  prompt?: string;

  @IsInt()
  @Min(10)
  @Max(10000)
  @IsOptional()
  wordCount?: number;
}

export class AiCompareDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  models?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  prompt?: string;
}
