import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(createCampaignDto: CreateCampaignDto, userId: string) {
    const campaign = await this.prisma.campaign.create({
      data: {
        ...createCampaignDto,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Emit WebSocket event
    this.eventsGateway.emitCampaignCreated(userId, campaign);

    return campaign;
  }

  async findAll(userId: string, status?: CampaignStatus) {
    const where = {
      createdById: userId,
      ...(status && { status }),
    };

    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contentPieces: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            language: true,
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contentPieces: {
          include: {
            translations: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    if (campaign.createdById !== userId) {
      throw new ForbiddenException('You can only access your own campaigns');
    }

    return campaign;
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto, userId: string) {
    const campaign = await this.findOne(id, userId);

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: updateCampaignDto,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Emit WebSocket event
    this.eventsGateway.emitCampaignUpdated(userId, updatedCampaign);

    return updatedCampaign;
  }

  async remove(id: string, userId: string) {
    const campaign = await this.findOne(id, userId);

    const result = await this.prisma.campaign.delete({
      where: { id },
    });

    // Emit WebSocket event
    this.eventsGateway.emitCampaignDeleted(userId, id);

    return result;
  }
}
