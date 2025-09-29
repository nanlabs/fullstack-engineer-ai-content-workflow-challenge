import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { TranslationsService } from '../translations/translations.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ContentController],
  providers: [ContentService, TranslationsService],
  exports: [ContentService],
})
export class ContentModule {}
