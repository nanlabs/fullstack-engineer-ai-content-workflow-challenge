import { Injectable } from '@nestjs/common';
import { ContentPieceTranslationService } from './content-piece-translations.service';
import { PubSub } from 'graphql-subscriptions';
import { Subscription } from '@nestjs/graphql';
import { ContentPieceTranslation } from './content-piece-translations.entity';

@Injectable()
export class ContentPieceTranslationResolver {
  constructor(
    private readonly contentPieceTranslationService: ContentPieceTranslationService,
    private readonly pubSub: PubSub,
  ) {}

  @Subscription(() => ContentPieceTranslation, {
    name: 'onContentPieceTranslationUpdated',
  })
  onContentPieceTranslationUpdated() {
    return this.pubSub.asyncIterableIterator<ContentPieceTranslation>('onContentPieceTranslationUpdated');
  }
}
