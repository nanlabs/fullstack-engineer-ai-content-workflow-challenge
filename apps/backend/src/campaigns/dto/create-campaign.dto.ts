import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'The name of the campaign',
    example: 'Summer Socials 2025',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'A brief description of the campaign',
    example: 'Marketing content for the summer product line.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}
