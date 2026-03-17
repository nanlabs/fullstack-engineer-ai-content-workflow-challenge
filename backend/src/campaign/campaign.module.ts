import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignController } from './campaign.controller';
import { Campaign } from './campaign.entity';
import { CampaignService } from './campaign.service';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';
import { AiService } from '../ai/ai.service';
import { AiController } from '../ai/ai.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { AiModelCatalogService } from '../ai/ai-model-catalog.service';
import { AiGenerationService } from '../ai/ai-generation.service';
import { AiInvokeService } from '../ai/ai-invoke.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, ContentPiece, ContentLocalization]),
    RealtimeModule,
  ],
  controllers: [CampaignController, AiController],
  providers: [
    CampaignService,
    AiService,
    AiModelCatalogService,
    AiGenerationService,
    AiInvokeService,
  ],
  exports: [CampaignService],
})
export class CampaignModule {}
