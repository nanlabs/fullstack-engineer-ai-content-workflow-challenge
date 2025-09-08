import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { ContentPiecesService } from './content-pieces.service';
import { Subscription } from '@nestjs/graphql';
import { ContentPiece } from './content-piece.entity';

@Injectable()
export class ContentPiecesResolver {
  constructor(
    private readonly contentPieceService: ContentPiecesService,
    private readonly pubSub: PubSub,
  ) {}

  @Subscription(() => ContentPiece, {
    name: 'onContentPieceUpdated',
  })
  onContentPieceUpdated() {
    return this.pubSub.asyncIterableIterator<ContentPiece>('onContentPieceUpdated');
  }
}
