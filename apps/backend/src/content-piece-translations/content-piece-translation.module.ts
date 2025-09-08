import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentPieceTranslation } from './content-piece-translation.entity';
import { ContentPieceTranslationService } from './content-piece-translation.service';
import { ContentPieceTranslationController } from './content-piece-translation.controller';
import { ContentPiecesModule } from 'src/content-pieces/content-pieces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentPieceTranslation]),
    ContentPiecesModule,
  ],
  controllers: [ContentPieceTranslationController],
  providers: [ContentPieceTranslationService],
  exports: [ContentPieceTranslationService],
})
export class ContentPieceTranslationModule {}
