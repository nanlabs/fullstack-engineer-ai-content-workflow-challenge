import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './campaigns.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateCampaignDto, userId: string) {
    const campaign = await this.prisma.campaign.create({ data: { ...dto, userId } });
    this.events.emit('campaign.created', { ...campaign, userId });
    return campaign;
  }

  async findAll(userId: string) {
    return this.prisma.campaign.findMany({
      where: { userId },
      include: {
        contentPieces: {
          where: { parentId: null },
          select: { id: true, status: true, title: true, language: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        contentPieces: {
          where: { parentId: null },
          include: { translations: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!campaign || campaign.userId !== userId) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto, userId: string) {
    await this.findOne(id, userId);
    const updated = await this.prisma.campaign.update({ where: { id }, data: dto });
    this.events.emit('campaign.updated', { ...updated, userId });
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    const deleted = await this.prisma.campaign.delete({ where: { id } });
    this.events.emit('campaign.deleted', { id, userId });
    return deleted;
  }
}
