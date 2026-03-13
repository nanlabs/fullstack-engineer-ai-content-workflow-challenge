import { Injectable, NotFoundException } from '@nestjs/common';
import { Campaign } from './campaign.entity';
import { CampaignRepository } from './campaign.repository';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignService {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async createCampaign(payload: CreateCampaignDto): Promise<Campaign> {
    return this.campaignRepository.createAndSave({
      topic: payload.topic,
      description: payload.description,
    });
  }

  async getCampaigns(): Promise<Campaign[]> {
    return this.campaignRepository.findAll();
  }

  async getCampaignById(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }
    return campaign;
  }
}
