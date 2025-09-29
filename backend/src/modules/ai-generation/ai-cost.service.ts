import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ModelCostConfig {
  name: string;
  provider: string;
  inputCostPer1K: number;  // Cost per 1K input tokens
  outputCostPer1K: number; // Cost per 1K output tokens
  displayName: string;
  description?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostCalculation {
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

@Injectable()
export class AiCostService {
  private readonly logger = new Logger(AiCostService.name);

  // Model configurations with average pricing
  private readonly modelConfigs: Record<string, ModelCostConfig> = {
    'gpt-3.5-turbo': {
      name: 'gpt-3.5-turbo',
      provider: 'openai',
      inputCostPer1K: 0.0015,
      outputCostPer1K: 0.002,
      displayName: 'GPT-3.5 Turbo',
      description: 'Fast and cost-effective for most tasks'
    },
    'gpt-4': {
      name: 'gpt-4',
      provider: 'openai',
      inputCostPer1K: 0.03,
      outputCostPer1K: 0.06,
      displayName: 'GPT-4',
      description: 'Most capable model for complex tasks'
    },
    'gpt-4-turbo': {
      name: 'gpt-4-turbo',
      provider: 'openai',
      inputCostPer1K: 0.01,
      outputCostPer1K: 0.03,
      displayName: 'GPT-4 Turbo',
      description: 'Balanced performance and cost'
    },
    'claude-3-haiku': {
      name: 'claude-3-haiku',
      provider: 'anthropic',
      inputCostPer1K: 0.00025,
      outputCostPer1K: 0.00125,
      displayName: 'Claude 3 Haiku',
      description: 'Fast and efficient for simple tasks'
    },
    'claude-3-sonnet': {
      name: 'claude-3-sonnet',
      provider: 'anthropic',
      inputCostPer1K: 0.003,
      outputCostPer1K: 0.015,
      displayName: 'Claude 3 Sonnet',
      description: 'Balanced performance for most tasks'
    },
    'claude-3-opus': {
      name: 'claude-3-opus',
      provider: 'anthropic',
      inputCostPer1K: 0.015,
      outputCostPer1K: 0.075,
      displayName: 'Claude 3 Opus',
      description: 'Most capable for complex reasoning'
    }
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Get available AI models for selection
   */
  getAvailableModels(): ModelCostConfig[] {
    return Object.values(this.modelConfigs);
  }

  /**
   * Get model configuration by name
   */
  getModelConfig(modelName: string): ModelCostConfig | null {
    return this.modelConfigs[modelName] || null;
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(modelName: string, tokenUsage: TokenUsage): CostCalculation {
    const config = this.getModelConfig(modelName);
    if (!config) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const inputCost = (tokenUsage.promptTokens / 1000) * config.inputCostPer1K;
    const outputCost = (tokenUsage.completionTokens / 1000) * config.outputCostPer1K;
    const totalCost = inputCost + outputCost;

    return {
      model: modelName,
      inputTokens: tokenUsage.promptTokens,
      outputTokens: tokenUsage.completionTokens,
      inputCost: Math.round(inputCost * 10000) / 10000, // Round to 4 decimal places
      outputCost: Math.round(outputCost * 10000) / 10000,
      totalCost: Math.round(totalCost * 10000) / 10000
    };
  }

  /**
   * Estimate cost based on prompt and expected response length
   */
  estimateCost(modelName: string, promptLength: number, estimatedResponseLength: number = 500): CostCalculation {
    // Rough estimation: 1 token ≈ 4 characters
    const estimatedPromptTokens = Math.ceil(promptLength / 4);
    const estimatedCompletionTokens = Math.ceil(estimatedResponseLength / 4);

    return this.calculateCost(modelName, {
      promptTokens: estimatedPromptTokens,
      completionTokens: estimatedCompletionTokens,
      totalTokens: estimatedPromptTokens + estimatedCompletionTokens
    });
  }

  /**
   * Update draft with cost information
   */
  async updateDraftCost(draftId: string, costCalculation: CostCalculation): Promise<void> {
    try {
      await this.prisma.draft.update({
        where: { id: draftId },
        data: {
          cost: costCalculation.totalCost,
          aiModel: costCalculation.model
        }
      });

      // Update content piece total cost
      await this.updateContentPieceCost(draftId);
      
      this.logger.log(`Updated draft ${draftId} with cost: $${costCalculation.totalCost}`);
    } catch (error) {
      this.logger.error(`Error updating draft cost for ${draftId}:`, error);
      throw error;
    }
  }

  /**
   * Update content piece total cost
   */
  private async updateContentPieceCost(draftId: string): Promise<void> {
    try {
      // Get the draft to find its content piece
      const draft = await this.prisma.draft.findUnique({
        where: { id: draftId },
        select: { contentPieceId: true }
      });

      if (!draft) {
        throw new Error(`Draft ${draftId} not found`);
      }

      // Calculate total cost for all drafts in this content piece
      const totalCost = await this.prisma.draft.aggregate({
        where: { contentPieceId: draft.contentPieceId },
        _sum: { cost: true }
      });

      // Update content piece total cost
      await this.prisma.contentPiece.update({
        where: { id: draft.contentPieceId },
        data: { totalCost: totalCost._sum.cost || 0 }
      });

      // Update campaign total cost
      await this.updateCampaignCost(draft.contentPieceId);
    } catch (error) {
      this.logger.error(`Error updating content piece cost:`, error);
      throw error;
    }
  }

  /**
   * Update campaign total cost
   */
  private async updateCampaignCost(contentPieceId: string): Promise<void> {
    try {
      // Get the content piece to find its campaign
      const contentPiece = await this.prisma.contentPiece.findUnique({
        where: { id: contentPieceId },
        select: { campaignId: true }
      });

      if (!contentPiece) {
        throw new Error(`Content piece ${contentPieceId} not found`);
      }

      // Calculate total cost for all content pieces in this campaign
      const totalCost = await this.prisma.contentPiece.aggregate({
        where: { campaignId: contentPiece.campaignId },
        _sum: { totalCost: true }
      });

      // Update campaign total cost
      await this.prisma.campaign.update({
        where: { id: contentPiece.campaignId },
        data: { totalCost: totalCost._sum.totalCost || 0 }
      });

      this.logger.log(`Updated campaign ${contentPiece.campaignId} total cost: $${totalCost._sum.totalCost || 0}`);
    } catch (error) {
      this.logger.error(`Error updating campaign cost:`, error);
      throw error;
    }
  }

  /**
   * Get cost summary for a campaign
   */
  async getCampaignCostSummary(campaignId: string): Promise<{
    campaignCost: number;
    contentPieceCount: number;
    draftCount: number;
    averageCostPerContentPiece: number;
    averageCostPerDraft: number;
    costByModel: Record<string, number>;
  }> {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { totalCost: true }
      });

      const contentPieceStats = await this.prisma.contentPiece.aggregate({
        where: { campaignId },
        _count: { id: true },
        _sum: { totalCost: true }
      });

      const draftStats = await this.prisma.draft.aggregate({
        where: { 
          contentPiece: { campaignId }
        },
        _count: { id: true }
      });

      const costByModel = await this.prisma.draft.groupBy({
        by: ['aiModel'],
        where: {
          contentPiece: { campaignId }
        },
        _sum: { cost: true }
      });

      const costByModelMap = costByModel.reduce((acc, item) => {
        acc[item.aiModel || 'unknown'] = item._sum.cost || 0;
        return acc;
      }, {} as Record<string, number>);

      return {
        campaignCost: campaign?.totalCost || 0,
        contentPieceCount: contentPieceStats._count.id,
        draftCount: draftStats._count.id,
        averageCostPerContentPiece: contentPieceStats._count.id > 0 
          ? (contentPieceStats._sum.totalCost || 0) / contentPieceStats._count.id 
          : 0,
        averageCostPerDraft: draftStats._count.id > 0 
          ? (campaign?.totalCost || 0) / draftStats._count.id 
          : 0,
        costByModel: costByModelMap
      };
    } catch (error) {
      this.logger.error(`Error getting campaign cost summary for ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Get global cost statistics
   */
  async getGlobalCostStats(): Promise<{
    totalCampaigns: number;
    totalCost: number;
    averageCostPerCampaign: number;
    costByModel: Record<string, number>;
  }> {
    try {
      const campaignStats = await this.prisma.campaign.aggregate({
        _count: { id: true },
        _sum: { totalCost: true }
      });

      const costByModel = await this.prisma.draft.groupBy({
        by: ['aiModel'],
        _sum: { cost: true }
      });

      const costByModelMap = costByModel.reduce((acc, item) => {
        acc[item.aiModel || 'unknown'] = item._sum.cost || 0;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalCampaigns: campaignStats._count.id,
        totalCost: campaignStats._sum.totalCost || 0,
        averageCostPerCampaign: campaignStats._count.id > 0 
          ? (campaignStats._sum.totalCost || 0) / campaignStats._count.id 
          : 0,
        costByModel: costByModelMap
      };
    } catch (error) {
      this.logger.error('Error getting global cost stats:', error);
      throw error;
    }
  }
}
