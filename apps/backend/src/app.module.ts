import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContentPiecesModule } from './content-pieces/content-pieces.module';
import { ContentPieceTranslationModule } from './content-piece-translations/content-piece-translation.module';

@Module({
  imports: [
    ConfigModule.forRoot(),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true, // Automatically load all entities
      synchronize: true, // Auto-create database tables (for development only)
    }),

    // Feature modules
    CampaignsModule,
    ContentPiecesModule,
    ContentPieceTranslationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
