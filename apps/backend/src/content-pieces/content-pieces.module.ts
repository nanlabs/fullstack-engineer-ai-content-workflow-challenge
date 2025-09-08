import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentPiece } from './content-piece.entity';
import { ContentPiecesService } from './content-pieces.service';
import { ContentPiecesController } from './content-pieces.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContentPiece])],
  controllers: [ContentPiecesController],
  providers: [ContentPiecesService],
  exports: [ContentPiecesService],
})
export class ContentPiecesModule {}
