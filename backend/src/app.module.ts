import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContentModule } from './content/content.module';
import { AiModule } from './ai/ai.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AppConfigModule } from './config/config.module';
import { typeOrmConfig } from './config/typeorm.config';
import { HealthModule } from './health/health.module';
import { SeedModule } from './seed/seed.module';

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
    HealthModule,
    SeedModule,
  ],
})
export class AppModule {}
