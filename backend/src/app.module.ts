import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './common/prisma.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContentModule } from './content/content.module';
import { AiModule } from './ai/ai.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './common/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 20,
    }]),
    EventEmitterModule.forRoot({ wildcard: true }),
    PrismaModule,
    AuthModule,
    CampaignsModule,
    ContentModule,
    AiModule,
    EventsModule,
  ],
})
export class AppModule {}
