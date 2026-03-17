import { Injectable } from '@nestjs/common';
import { Campaign } from '../campaign/campaign.entity';
import { AiGenerationService } from './ai-generation.service';
import { AiModelCatalogService } from './ai-model-catalog.service';
import { ProviderModel } from './ai.types';

@Injectable()
export class AiService {
  constructor(
    private readonly aiModelCatalogService: AiModelCatalogService,
    private readonly aiGenerationService: AiGenerationService,
  ) {}

  async getModelsByProvider(provider: string): Promise<ProviderModel[]> {
    return this.aiModelCatalogService.getModelsByProvider(provider);
  }

  async generateCampaignContent(campaign: Campaign, languages: string[]): Promise<void> {
    await this.aiGenerationService.generateCampaignContent(campaign, languages);
  }
}
