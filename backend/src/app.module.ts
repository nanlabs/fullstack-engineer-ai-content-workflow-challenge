import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContentModule } from './content/content.module';
import { DraftsModule } from './drafts/drafts.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CampaignsModule,
    ContentModule,
    DraftsModule,
    AiModule,
  ],
})
export class AppModule {}
