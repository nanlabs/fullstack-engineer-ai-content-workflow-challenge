import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, ContentPiece, ContentLocalization])],
  providers: [SeedService],
})
export class SeedModule {}
