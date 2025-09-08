import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './campaign.entity';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    private readonly pubSub: PubSub,
  ) {}

  async create(createCampaignDto: Partial<Campaign>): Promise<Campaign> {
    const entity = this.campaignRepository.create(createCampaignDto);
    const newCampaign = await this.campaignRepository.save(entity);

    await this.pubSub.publish('onCampaignUpdated', { onCampaignUpdated: newCampaign });
    return newCampaign;
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

  async update(id: string, updateCampaignDto: Partial<Campaign>): Promise<Campaign> {
    const entity = await this.findOne(id);
    Object.assign(entity, updateCampaignDto);
    const campaign = await this.campaignRepository.save(entity);

    await this.pubSub.publish('onCampaignUpdated', { onCampaignUpdated: campaign });
    return campaign;
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.campaignRepository.remove(entity);

    await this.pubSub.publish('onCampaignUpdated', { onCampaignUpdated: { id } });
  }
}
