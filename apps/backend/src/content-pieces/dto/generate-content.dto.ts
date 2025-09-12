import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateContentDto {
  @ApiProperty({
    description: 'The ID of the content piece to update. If not provided, a new content piece will be created.',
    required: false,
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'The ID of the campaign to associate with the new content piece. Required if id is not provided.',
    required: false,
  })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty({ description: 'The locale for the content piece', example: 'en-EN' })
  @IsString()
  locale: string;

  @ApiProperty({ description: 'The model provider to use', example: 'openai', enum: ['openai', 'anthropic'] })
  @IsString()
  @IsIn(['openai', 'anthropic'], {
    message: 'modelProvider must be either "openai" or "anthropic"',
  })
  modelProvider: 'openai' | 'anthropic';
}
