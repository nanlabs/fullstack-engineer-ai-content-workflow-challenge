import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContentModule } from './content/content.module';
import { AiModule } from './ai/ai.module';
import { EventsModule } from './gateway/events.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule,
    PrismaModule,
    CampaignsModule,
    ContentModule,
    AiModule,
    EventsModule,
  ],
})
export class AppModule {}
