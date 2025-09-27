import { Module } from '@nestjs/common';
import { AiGenerationService } from './ai-generation.service';
import { AiGenerationController } from './ai-generation.controller';
import { AgentOrchestrationService } from './agent-orchestration.service';
import { WebSearchService } from './web-search.service';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [WebsocketsModule],
  controllers: [AiGenerationController],
  providers: [AiGenerationService, AgentOrchestrationService, WebSearchService],
  exports: [AiGenerationService, AgentOrchestrationService, WebSearchService],
})
export class AiGenerationModule {}
