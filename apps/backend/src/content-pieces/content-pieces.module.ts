import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentPiece } from './content-piece.entity';
import { ContentPiecesService } from './content-pieces.service';
import { ContentPiecesResolver } from './content-pieces.resolver';
import { ContentPiecesController } from './content-pieces.controller';
import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [TypeOrmModule.forFeature([ContentPiece])],
  controllers: [ContentPiecesController],
  providers: [
    ContentPiecesService,
    ContentPiecesResolver,
    {
      provide: PubSub,
      useValue: new PubSub(),
    },
  ],
  exports: [ContentPiecesService],
})
export class ContentPiecesModule {}
