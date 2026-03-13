import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentLocalizationController } from './content-localization.controller';
import { ContentLocalizationService } from './content-localization.service';
import { ContentLocalization } from './content-localizations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContentLocalization])],
  controllers: [ContentLocalizationController],
  providers: [ContentLocalizationService],
  exports: [ContentLocalizationService],
})
export class ContentLocalizationModule {}
