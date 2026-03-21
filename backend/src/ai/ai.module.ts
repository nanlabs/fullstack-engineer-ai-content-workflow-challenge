import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ModelFactory } from './model-factory.service';
import { ContentWorkflow } from './content-workflow';

@Module({
  imports: [ContentModule],
  controllers: [AiController],
  providers: [AiService, ModelFactory, ContentWorkflow],
  exports: [AiService, ModelFactory],
})
export class AiModule {}
