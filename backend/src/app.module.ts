import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ContentModule } from './modules/content/content.module';
import { TranslationsModule } from './modules/translations/translations.module';
import { UsersModule } from './modules/users/users.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // max 100 requests per minute
    }]),
    DatabaseModule,
    AiModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    ContentModule,
    TranslationsModule,
  ],
})
export class AppModule {}
