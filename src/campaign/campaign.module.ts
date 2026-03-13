import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignController } from './campaign.controller';
import { Campaign } from './campaign.entity';
import { CampaignRepository } from './campaign.repository';
import { CampaignService } from './campaign.service';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, ContentPiece, ContentLocalization])],
  controllers: [CampaignController],
  providers: [CampaignRepository, CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
