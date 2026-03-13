import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Campaign } from './campaign.entity';
import { ContentPiece } from '../content-piece/content-pieces.entity';

@Injectable()
export class CampaignRepository {
  private readonly repository: Repository<Campaign>;
  private readonly contentPieceRepository: Repository<ContentPiece>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Campaign);
    this.contentPieceRepository = this.dataSource.getRepository(ContentPiece);
  }

  async createAndSave(input: {
    topic: string;
    description?: string;
    languages: string[];
    llmProvider: string;
    model: string;
  }): Promise<Campaign> {
    const campaign = this.repository.create({
      topic: input.topic,
      description: input.description ?? null,
      languages: input.languages,
      llmProvider: input.llmProvider,
      model: input.model,
    });

    return this.repository.save(campaign);
  }

  async findAll(): Promise<Campaign[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      relations: { pieces: true },
    });
  }

  async findById(id: string): Promise<Campaign | null> {
    return this.repository.findOne({
      where: { id },
      relations: { pieces: true },
    });
  }

  async addPieceToCampaign(
    campaignId: string,
    input: { name: string; type: string },
  ): Promise<ContentPiece> {
    const piece = this.contentPieceRepository.create({
      name: input.name,
      type: input.type,
      campaign: { id: campaignId } as Campaign,
    });

    return this.contentPieceRepository.save(piece);
  }
}
