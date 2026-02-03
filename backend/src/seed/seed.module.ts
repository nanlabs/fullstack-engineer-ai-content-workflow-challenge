import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaigns/campaign.entity';
import { ContentPiece } from '../content/content-piece.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, ContentPiece])],
  providers: [SeedService],
})
export class SeedModule {}
