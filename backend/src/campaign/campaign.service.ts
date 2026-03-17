import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { CreatePieceDto } from './dto/create-piece.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(ContentPiece)
    private readonly contentPieceRepo: Repository<ContentPiece>,
    private readonly aiService: AiService,
  ) {}

  async createCampaign(payload: CreateCampaignDto): Promise<Campaign> {
    const normalizedLocalizations = payload.languages.map((locale) => this.normalizeLocale(locale));

    const campaign = await this.campaignRepo.save({
      topic: payload.topic,
      description: payload.description,
      languages: normalizedLocalizations,
      llmProvider: payload.provider,
      model: payload.model,
    });

    // Run AI generation in background so the API can return immediately and the UI
    // can show realtime progress while processing continues.
    // Delay slightly to let frontend join the campaign socket room before first events.
    setTimeout(() => {
      void this.aiService.generateCampaignContent(campaign, normalizedLocalizations).catch((error) => {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.error(`Background AI generation failed for campaign ${campaign.id}: ${reason}`);
      });
    }, 500);

    return campaign;
  }

  async getCampaigns(): Promise<Record<string, unknown>[]> {
    const campaigns = await this.campaignRepo.find({
      order: { createdAt: 'DESC' },
      relations: { pieces: { localizations: true } },
    });

    // Dashboard view: avoid sending full generated content bodies for every row.
    return campaigns.map((campaign) => ({
      ...campaign,
      pieces: campaign.pieces.map((piece) => ({
        ...piece,
        localizations: piece.localizations.map((loc) => ({
          id: loc.id,
          languageCode: loc.languageCode,
          status: loc.status,
          updatedAt: loc.updatedAt,
        })),
      })),
    }));
  }

  async getCampaignById(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id },
      relations: { pieces: { localizations: true } },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }
    return campaign;
  }

  async addPieceToCampaign(campaignId: string, payload: CreatePieceDto): Promise<ContentPiece> {
    await this.getCampaignById(campaignId);
    const piece = this.contentPieceRepo.create({
      name: payload.name,
      type: payload.type,
      campaign: { id: campaignId } as Campaign,
    });
    return this.contentPieceRepo.save(piece);
  }

  private normalizeLocale(rawLocale: string): string {
    const [language, region] = rawLocale.split('-');
    if (!language || !region) {
      return rawLocale;
    }
    return `${language.toLowerCase()}-${region.toUpperCase()}`;
  }
}
