import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentLocalizationController } from './content-localization.controller';
import { ContentLocalizationService } from './content-localization.service';
import { ContentLocalization } from './content-localizations.entity';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContentLocalization]), RealtimeModule],
  controllers: [ContentLocalizationController],
  providers: [ContentLocalizationService],
  exports: [ContentLocalizationService],
})
export class ContentLocalizationModule {}
