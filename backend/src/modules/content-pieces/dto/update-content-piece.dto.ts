import { PartialType } from '@nestjs/mapped-types';
import { CreateContentPieceDto } from './create-content-piece.dto';

export class UpdateContentPieceDto extends PartialType(CreateContentPieceDto) {}
