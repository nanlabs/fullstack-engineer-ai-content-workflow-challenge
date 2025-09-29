import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { ContentService } from '../content/content.service';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, ContentService],
})
export class CampaignsModule {}
