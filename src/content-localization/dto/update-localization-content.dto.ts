import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateLocalizationContentDto {
  @ApiPropertyOptional({ example: 'Summer skincare essentials for glowing skin' })
  @IsOptional()
  @IsString()
  titleSuggestion?: string;

  @ApiPropertyOptional({ example: 'Discover lightweight products perfect for warm weather.' })
  @IsOptional()
  @IsString()
  bodySuggestion?: string;
}
