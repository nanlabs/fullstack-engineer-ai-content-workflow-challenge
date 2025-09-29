import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { AiGenerationService } from './ai-generation.service';
import { AiCostService } from './ai-cost.service';

@Controller('ai-generation')
export class AiGenerationController {
  constructor(
    private readonly aiGenerationService: AiGenerationService,
    private readonly aiCostService: AiCostService
  ) {}

  @Post('generate-draft')
  async generateDraft(@Body() body: { 
    contentPieceId: string; 
    prompt: string;
    contentType?: string;
    language?: string;
    modelName?: string;
  }) {
    try {
      const draft = await this.aiGenerationService.generateDraft(
        body.contentPieceId, 
        body.prompt,
        body.contentType,
        body.language,
        body.modelName
      );
      return {
        success: true,
        data: draft,
        message: 'AI draft generated successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to generate AI draft',
          error: 'AI_GENERATION_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('models')
  async getAvailableModels() {
    try {
      const models = this.aiCostService.getAvailableModels();
      return {
        success: true,
        data: models,
        message: 'Available AI models retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve available models',
          error: 'MODELS_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('cost-summary/campaign/:campaignId')
  async getCampaignCostSummary(@Param('campaignId') campaignId: string) {
    try {
      const costSummary = await this.aiCostService.getCampaignCostSummary(campaignId);
      return {
        success: true,
        data: costSummary,
        message: 'Campaign cost summary retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve campaign cost summary',
          error: 'COST_SUMMARY_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('cost-summary/global')
  async getGlobalCostStats() {
    try {
      const globalStats = await this.aiCostService.getGlobalCostStats();
      return {
        success: true,
        data: globalStats,
        message: 'Global cost statistics retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve global cost statistics',
          error: 'GLOBAL_STATS_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
