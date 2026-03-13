import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Campaign } from './campaign.entity';

@Injectable()
export class CampaignRepository {
  private readonly repository: Repository<Campaign>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Campaign);
  }

  async createAndSave(input: { topic: string; description?: string }): Promise<Campaign> {
    const campaign = this.repository.create({
      topic: input.topic,
      description: input.description ?? null,
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
}
