import { PubSub } from 'graphql-subscriptions';
import { Resolver, Subscription } from '@nestjs/graphql';
import { ContentPieceTranslation } from './content-piece-translations.entity';

@Resolver(() => ContentPieceTranslation)
export class ContentPieceTranslationResolver {
  constructor(private readonly pubSub: PubSub) {}

  @Subscription(() => ContentPieceTranslation, {
    name: 'contentPieceTranslationUpdated',
  })
  contentPieceTranslationUpdated() {
    return this.pubSub.asyncIterableIterator<ContentPieceTranslation>('contentPieceTranslationUpdated');
  }
}
