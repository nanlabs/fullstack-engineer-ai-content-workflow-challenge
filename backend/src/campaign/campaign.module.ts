import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignController } from './campaign.controller';
import { Campaign } from './campaign.entity';
import { CampaignService } from './campaign.service';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';
import { AiService } from '../ai/ai.service';
import { AiController } from '../ai/ai.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, ContentPiece, ContentLocalization])],
  controllers: [CampaignController, AiController],
  providers: [CampaignService, AiService],
  exports: [CampaignService],
})
export class CampaignModule {}
