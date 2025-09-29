import { Module } from '@nestjs/common';
import { AiGenerationService } from './ai-generation.service';
import { AiGenerationController } from './ai-generation.controller';
import { AgentOrchestrationService } from './agent-orchestration.service';
import { WebSearchService } from './web-search.service';
import { AiCostService } from './ai-cost.service';
import { WebsocketsModule } from '../websockets/websockets.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [WebsocketsModule, DocumentsModule],
  controllers: [AiGenerationController],
  providers: [AiGenerationService, AgentOrchestrationService, WebSearchService, AiCostService],
  exports: [AiGenerationService, AgentOrchestrationService, WebSearchService, AiCostService],
})
export class AiGenerationModule {}
