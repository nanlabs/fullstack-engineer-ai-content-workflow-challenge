import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ContentType } from '@prisma/client';

export class GenerateContentDto {
  @ApiProperty({ 
    example: 'Create an engaging social media post about our new summer collection launch' 
  })
  @IsString()
  prompt: string;

  @ApiProperty({ 
    enum: ContentType,
    example: ContentType.SOCIAL_POST 
  })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiPropertyOptional({ 
    example: 'gpt-3.5-turbo' 
  })
  @IsOptional()
  @IsString()
  model?: string;
}
