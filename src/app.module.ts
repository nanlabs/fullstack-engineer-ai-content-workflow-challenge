import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignModule } from './campaign/campaign.module';
import { Campaign } from './campaign/campaign.entity';
import { ContentPiece } from './content-piece/content-pieces.entity';
import { ContentLocalization } from './content-localization/content-localizations.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    CampaignModule,
  ],
})
export class AppModule {}
