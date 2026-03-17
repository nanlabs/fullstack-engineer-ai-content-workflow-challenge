import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'path';
import { CampaignModule } from './campaign/campaign.module';
import { Campaign } from './campaign/campaign.entity';
import { ContentPiece } from './content-piece/content-pieces.entity';
import { ContentLocalization } from './content-localization/content-localizations.entity';
import { ContentLocalizationModule } from './content-localization/content-localization.module';
import { SeedModule } from './seed/seed.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Prefer repo root .env; keep backend/.env as fallback for local compatibility.
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5435')),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'content_workflow'),
        entities: [Campaign, ContentPiece, ContentLocalization],
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    EventsModule,
    CampaignModule,
    ContentLocalizationModule,
    SeedModule,
  ],
})
export class AppModule {}
