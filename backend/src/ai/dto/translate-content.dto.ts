import { ArrayNotEmpty, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class TranslateContentDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  targetLanguages: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}
