import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './campaign.entity';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  async create(createCampaignDto: Partial<Campaign>): Promise<Campaign> {
    const newCampaign = this.campaignRepository.create(createCampaignDto);
    return this.campaignRepository.save(newCampaign);
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    return campaign;
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignRepository.find();
  }
}
