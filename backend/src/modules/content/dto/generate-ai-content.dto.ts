import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GenerateAiContentDto {
  @ApiProperty({ 
    example: 'Create a social media post about our summer product launch. Make it engaging and include a call to action.' 
  })
  @IsString()
  @MinLength(10)
  prompt: string;

  @ApiProperty({ example: 'gpt-4' })
  @IsString()
  model: string;
}
