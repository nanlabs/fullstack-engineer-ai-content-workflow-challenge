import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { TranslationsService } from '../translations/translations.service';
import { AiModule } from '../ai/ai.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [AiModule, EventsModule],
  controllers: [ContentController],
  providers: [ContentService, TranslationsService],
  exports: [ContentService],
})
export class ContentModule {}
