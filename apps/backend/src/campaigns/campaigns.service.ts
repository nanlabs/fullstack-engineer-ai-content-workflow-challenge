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

    await this.pubSub.publish('campaignUpdated', { campaignUpdated: { ...newCampaign, _type: 'create' } });
    return newCampaign;
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      order: { updatedAt: 'DESC' },
      relations: ['contentPieces'],
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    return campaign;
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignRepository.find({
      relations: ['contentPieces'],
      order: { updatedAt: 'ASC', createdAt: 'DESC' },
    });
  }

  async update(id: string, updateCampaignDto: Partial<Campaign>): Promise<Campaign> {
    const entity = await this.findOne(id);
    Object.assign(entity, updateCampaignDto);
    const campaign = await this.campaignRepository.save(entity);

    await this.pubSub.publish('campaignUpdated', { campaignUpdated: { ...campaign, _type: 'update' } });
    return campaign;
  }

  async remove(id: string): Promise<Campaign> {
    const entity = await this.findOne(id);
    const result = await this.campaignRepository.remove(entity);

    await this.pubSub.publish('campaignUpdated', { campaignUpdated: { ...result, id: id, _type: 'remove' } });
    return result;
  }
}
