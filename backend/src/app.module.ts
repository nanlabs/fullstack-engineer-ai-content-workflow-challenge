import { Module } from '@nestjs/common';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContentModule } from './content/content.module';
import { AiModule } from './ai/ai.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [CampaignsModule, ContentModule, AiModule, WebsocketModule],
})
export class AppModule {}
