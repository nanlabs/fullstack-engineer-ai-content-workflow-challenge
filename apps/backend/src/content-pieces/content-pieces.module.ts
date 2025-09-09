import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentPiece } from './content-piece.entity';
import { ContentPiecesService } from './content-pieces.service';
import { ContentPiecesResolver } from './content-pieces.resolver';
import { ContentPiecesController } from './content-pieces.controller';
import { PubSub } from 'graphql-subscriptions';
import { LangChainService } from 'src/langchain/langchain.service';
import { ContentPieceTranslationsModule } from 'src/content-piece-translations/content-piece-translations.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContentPiece]), ContentPieceTranslationsModule],
  controllers: [ContentPiecesController],
  providers: [
    ContentPiecesService,
    ContentPiecesResolver,
    LangChainService,
    {
      provide: PubSub,
      useValue: new PubSub(),
    },
  ],
  exports: [ContentPiecesService],
})
export class ContentPiecesModule {}
