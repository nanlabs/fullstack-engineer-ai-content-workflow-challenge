import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { CreatePieceDto } from './dto/create-piece.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(ContentPiece)
    private readonly contentPieceRepo: Repository<ContentPiece>,
    private readonly aiService: AiService,
  ) {}

  async createCampaign(payload: CreateCampaignDto): Promise<Campaign> {
    const campaign = await this.campaignRepo.save({
      topic: payload.topic,
      description: payload.description,
      languages: payload.languages,
      llmProvider: payload.provider,
      model: payload.model,
    });

    await this.aiService.generateCampaignContent(campaign, payload.languages);

    return campaign;
  }

  async getCampaigns(): Promise<Campaign[]> {
    return this.campaignRepo.find({
      order: { createdAt: 'DESC' },
      relations: { pieces: true },
    });
  }

  async getCampaignById(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id },
      relations: { pieces: true },
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
}
