import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Campaign } from '@prisma/client';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<(Campaign & { _count: { contents: number } })[]> {
    this.logger.log('Fetching all campaigns');
    return this.prisma.campaign.findMany({
      include: {
        _count: {
          select: { contents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Campaign> {
    this.logger.log(`Fetching campaign ${id}`);
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        contents: {
          include: {
            aiDrafts: { orderBy: { createdAt: 'desc' } },
            translations: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }

    return campaign;
  }

  async create(dto: CreateCampaignDto): Promise<Campaign> {
    this.logger.log(`Creating campaign: ${dto.name}`);
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        targetLangs: dto.targetLangs ?? [],
      },
    });
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    this.logger.log(`Updating campaign ${id}`);
    await this.findOne(id);

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.targetLangs !== undefined && { targetLangs: dto.targetLangs }),
      },
    });
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting campaign ${id}`);
    await this.findOne(id);
    await this.prisma.campaign.delete({ where: { id } });
  }
}
