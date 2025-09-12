import { PubSub } from 'graphql-subscriptions';
import { Parent, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { ContentPiece } from './content-piece.entity';
import { ContentPieceTranslation } from 'src/content-piece-translations/content-piece-translations.entity';
import { ContentPieceTranslationService } from 'src/content-piece-translations/content-piece-translations.service';

@Resolver(() => ContentPiece)
export class ContentPiecesResolver {
  constructor(
    private readonly contentPieceTranslationsService: ContentPieceTranslationService,
    private readonly pubSub: PubSub,
  ) {}

  @Subscription(() => ContentPiece, {
    name: 'contentPieceUpdated',
  })
  contentPieceUpdated() {
    return this.pubSub.asyncIterableIterator<ContentPiece>('contentPieceUpdated');
  }

  @ResolveField(() => [ContentPieceTranslation])
  async translations(@Parent() contentPiece: ContentPiece): Promise<ContentPieceTranslation[]> {
    return await this.contentPieceTranslationsService.findAll(contentPiece.id);
  }
}
