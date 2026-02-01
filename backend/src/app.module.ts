import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContentModule } from './content/content.module';
import { AiModule } from './ai/ai.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AppConfigModule } from './config/config.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    CampaignsModule,
    ContentModule,
    AiModule,
    WebsocketModule,
  ],
})
export class AppModule {}
