import { Resolver, Query, Mutation, Args, ID, Subscription, ResolveField, Parent } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { CampaignsService } from './campaigns.service';
import { Campaign } from './campaign.entity';
import { ContentPiece } from 'src/content-pieces/content-piece.entity';
import { ContentPiecesService } from 'src/content-pieces/content-pieces.service';

@Resolver(() => Campaign)
export class CampaignResolver {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly contentPiecesService: ContentPiecesService,
    private readonly pubSub: PubSub,
  ) {}

  @Query(() => [Campaign])
  async campaigns(): Promise<Campaign[]> {
    return this.campaignsService.findAll();
  }

  @Query(() => Campaign)
  async campaign(@Args('id', { type: () => ID }) id: string): Promise<Campaign> {
    return this.campaignsService.findOne(id);
  }

  @Subscription(() => Campaign, {
    name: 'campaignUpdated',
  })
  campaignUpdated() {
    return this.pubSub.asyncIterableIterator<Campaign>('campaignUpdated');
  }

  @ResolveField(() => [ContentPiece])
  async contentPieces(@Parent() campaign: Campaign): Promise<ContentPiece[]> {
    const data = await this.contentPiecesService.findAll(campaign.id);
    return data;
  }

  @Mutation(() => Campaign)
  async createCampaign(@Args('name') name: string, @Args('description') description: string): Promise<Campaign> {
    const campaign = await this.campaignsService.create({ name, description });
    return campaign;
  }

  @Mutation(() => Campaign)
  async updateCampaign(
    @Args('id', { type: () => ID }) id: string,
    @Args('name') name?: string,
    @Args('description') description?: string,
  ): Promise<Campaign> {
    const campaign = await this.campaignsService.update(id, { name, description });
    return campaign;
  }

  @Mutation(() => ID)
  async removeCampaign(@Args('id', { type: () => ID }) id: string): Promise<string> {
    await this.campaignsService.remove(id);
    return id;
  }
}
