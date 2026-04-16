import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

@Module({
  controllers: [AiController],
  providers: [AiService, OpenAiProvider, AnthropicProvider],
  exports: [AiService],
})
export class AiModule {}
