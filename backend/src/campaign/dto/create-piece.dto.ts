import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreatePieceDto {
  @ApiProperty({ example: 'Landing page hero copy' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Banner' })
  @IsString()
  @MinLength(2)
  type: string;
}
