import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { ReviewsService } from '../reviews/reviews.service';
import { TranslationsService } from '../translations/translations.service';

@Module({
  controllers: [ContentController],
  providers: [ContentService, ReviewsService, TranslationsService],
  exports: [ContentService],
})
export class ContentModule {}
