import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LangchainService } from './langchain.service';
import { EventsModule } from '../gateway/events.module';

@Module({
  imports: [EventsModule],
  controllers: [AiController],
  providers: [AiService, LangchainService],
  exports: [AiService, LangchainService],
})
export class AiModule {}
