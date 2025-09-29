import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TranslationStatus } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsUUID, MinLength } from 'class-validator';

export class CreateTranslationDto {
  @ApiProperty({ example: 'uuid-of-content-piece' })
  @IsUUID()
  contentPieceId: string;

  @ApiProperty({ example: 'Spanish', description: 'Language name (e.g., Spanish, French, German, Portuguese)' })
  @IsString()
  @MinLength(2)
  language: string;

  @ApiProperty({ example: 'Contenido traducido aquí...' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ 
    enum: TranslationStatus, 
    example: TranslationStatus.PENDING,
    description: 'Translation status (PENDING, COMPLETED, FAILED, REVIEWED)' 
  })
  @IsOptional()
  @IsEnum(TranslationStatus)
  status?: TranslationStatus;

  @ApiPropertyOptional({ example: 'gpt-4' })
  @IsOptional()
  @IsString()
  aiModelUsed?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  tokensUsed?: number;
}
