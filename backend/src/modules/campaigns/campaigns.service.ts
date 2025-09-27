import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { WebsocketsGateway } from '../websockets/websockets.gateway';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private websocketsGateway: WebsocketsGateway,
  ) {}

  async create(createCampaignDto: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: createCampaignDto,
      include: {
        contentPieces: {
          include: {
            drafts: true,
          },
        },
      },
    });

    // Notify all connected clients about the new campaign
    this.websocketsGateway.notifyCampaignCreated(campaign);

    return campaign;
  }

  async findAll() {
    return this.prisma.campaign.findMany({
      include: {
        contentPieces: {
          include: {
            drafts: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: {
        contentPieces: {
          include: {
            drafts: true,
          },
        },
      },
    });
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: updateCampaignDto,
      include: {
        contentPieces: {
          include: {
            drafts: true,
          },
        },
      },
    });

    // Notify all connected clients about the campaign update
    this.websocketsGateway.notifyCampaignUpdated(campaign);

    return campaign;
  }

  async remove(id: string) {
    const result = await this.prisma.campaign.delete({
      where: { id },
    });

    // Notify all connected clients about the campaign deletion
    this.websocketsGateway.notifyCampaignDeleted(id);

    return result;
  }
}
