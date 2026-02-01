import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './campaign.entity';
import { CampaignStatus } from './campaign-status.enum';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  async create(payload: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignRepository.create({
      name: payload.name,
      description: payload.description,
      status: payload.status ?? CampaignStatus.Active,
      targetLanguages: payload.targetLanguages ?? [],
    });

    return this.campaignRepository.save(campaign);
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignRepository.find();
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['contentPieces'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return campaign;
  }

  async update(id: string, payload: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id);

    Object.assign(campaign, {
      name: payload.name ?? campaign.name,
      description: payload.description ?? campaign.description,
      status: payload.status ?? campaign.status,
      targetLanguages: payload.targetLanguages ?? campaign.targetLanguages,
    });

    return this.campaignRepository.save(campaign);
  }

  async remove(id: string): Promise<void> {
    const result = await this.campaignRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
  }
}
