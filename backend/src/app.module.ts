import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ContentPiecesModule } from './modules/content-pieces/content-pieces.module';
import { AiGenerationModule } from './modules/ai-generation/ai-generation.module';
import { TranslationModule } from './modules/translation/translation.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { WebsocketsModule } from './modules/websockets/websockets.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CampaignsModule,
    ContentPiecesModule,
    AiGenerationModule,
    TranslationModule,
    DocumentsModule,
    WebsocketsModule,
    HealthModule,
  ],
})
export class AppModule {}
