import { PartialType } from '@nestjs/mapped-types';
import { CreateContentPieceTranslationDto } from './create-content-piece-translations.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateContentPieceTranslationDto extends PartialType(CreateContentPieceTranslationDto) {
  @ApiProperty({ description: 'The translated title', required: false })
  @IsOptional()
  @IsString()
  translatedTitle?: string;

  @ApiProperty({ description: 'The translated description', required: false })
  @IsOptional()
  @IsString()
  translatedDescription?: string;

  @ApiProperty({ description: 'A flag to indicate if a human has edited the translation', required: false })
  @IsOptional()
  @IsBoolean()
  isHumanEdited?: boolean;
}
