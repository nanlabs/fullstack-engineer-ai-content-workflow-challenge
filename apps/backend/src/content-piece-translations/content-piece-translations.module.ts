import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentPieceTranslation } from './content-piece-translations.entity';
import { ContentPieceTranslationService } from './content-piece-translations.service';
import { ContentPieceTranslationResolver } from './content-piece-translations.resolver';
import { ContentPieceTranslationController } from './content-piece-translations.controller';
import { ContentPiecesModule } from 'src/content-pieces/content-pieces.module';
import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [TypeOrmModule.forFeature([ContentPieceTranslation]), ContentPiecesModule],
  controllers: [ContentPieceTranslationController],
  providers: [
    ContentPieceTranslationService,
    ContentPieceTranslationResolver,
    {
      provide: PubSub,
      useValue: new PubSub(),
    },
  ],
  exports: [ContentPieceTranslationService],
})
export class ContentPieceTranslationsModule {}
