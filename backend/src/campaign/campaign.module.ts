import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignController } from './campaign.controller';
import { Campaign } from './campaign.entity';
import { CampaignService } from './campaign.service';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';
import { AiService } from '../ai/ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, ContentPiece, ContentLocalization])],
  controllers: [CampaignController],
  providers: [CampaignService, AiService],
  exports: [CampaignService],
})
export class CampaignModule {}
