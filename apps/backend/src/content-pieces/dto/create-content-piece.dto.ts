import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContentPieceDto {
  @ApiProperty({
    description: 'The source language of the content piece',
    example: 'en',
  })
  @IsString()
  @IsNotEmpty()
  sourceLanguage: string;
  
  @ApiProperty({
    description: 'The ID of the campaign this content piece belongs to',
    example: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsString()
  @IsNotEmpty()
  campaignId: string;
}
