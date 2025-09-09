import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './campaign.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignResolver } from './campaigns.resolver';
import { PubSub } from 'graphql-subscriptions';
import { ContentPiecesModule } from 'src/content-pieces/content-pieces.module';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign]), ContentPiecesModule],
  providers: [
    CampaignsService,
    CampaignResolver,
    {
      provide: PubSub,
      useValue: new PubSub(),
    },
  ],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
