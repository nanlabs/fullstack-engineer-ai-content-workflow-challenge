import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ModelProvider } from 'src/langchain/langchain.enum';

export class CreateContentPieceTranslationDto {
  @ApiProperty({
    description: 'The ID of the campaign this translation belongs to',
    example: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({
    description: 'The ID of the content piece this translation belongs to',
    example: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsString()
  @IsNotEmpty()
  contentPieceId: string;

  @ApiProperty({
    description: 'The model provider used for the translation',
    example: ModelProvider.OpenAI,
  })
  @IsString()
  @IsNotEmpty()
  modelProvider: ModelProvider;

  @ApiProperty({ description: 'The language code for the translation', example: 'es' })
  @IsString()
  @IsNotEmpty()
  languageCode: string;

  @ApiProperty({ description: 'The translated title', example: 'Hola Mundo' })
  @IsString()
  @IsNotEmpty()
  translatedTitle: string;

  @ApiProperty({ description: 'The translated description', example: 'Una breve descripcion.' })
  @IsString()
  @IsNotEmpty()
  translatedDescription: string;

  @ApiProperty({
    description: 'A flag to indicate if the translation was AI-generated',
    example: true,
  })
  @IsBoolean()
  isAIGenerated: boolean;

  @ApiProperty({
    description: 'A flag to indicate if a human has edited the translation',
    example: false,
  })
  @IsBoolean()
  isHumanEdited: boolean;
}
