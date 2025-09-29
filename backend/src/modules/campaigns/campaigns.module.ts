import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { ContentService } from '../content/content.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, ContentService],
})
export class CampaignsModule {}
