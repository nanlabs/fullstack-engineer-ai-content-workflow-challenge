import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WebsocketsGateway } from "../websockets/websockets.gateway";
import { AgentOrchestrationService } from "./agent-orchestration.service";

@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);

  constructor(
    private prisma: PrismaService,
    private websocketsGateway: WebsocketsGateway,
    private agentOrchestrationService: AgentOrchestrationService
  ) {}

  async generateDraft(
    contentPieceId: string, 
    prompt: string, 
    contentType?: string, 
    language?: string
  ) {
    try {
      // Get the content piece details for context
      const contentPiece = await this.prisma.contentPiece.findUnique({
        where: { id: contentPieceId },
        include: { campaign: true },
      });

      if (!contentPiece) {
        throw new Error("Content piece not found");
      }

      // Notify clients that AI generation has started
      this.websocketsGateway.notifyAIGenerationStarted(contentPieceId, prompt);

      // Use the new agent orchestration service
      const draft = await this.agentOrchestrationService.orchestrateGeneration({
        contentPieceId,
        prompt,
        contentType,
        language,
        campaignContext: {
          name: contentPiece.campaign.name,
          description: contentPiece.campaign.description,
        },
      });

      this.logger.log(`AI draft generated successfully for content piece: ${contentPieceId}`);
      return draft;
    } catch (error) {
      this.logger.error('Error generating AI draft:', error);
      
      // Notify clients that AI generation has failed
      this.websocketsGateway.notifyAIGenerationFailed(contentPieceId, error.message);
      
      throw error;
    }
  }
}
