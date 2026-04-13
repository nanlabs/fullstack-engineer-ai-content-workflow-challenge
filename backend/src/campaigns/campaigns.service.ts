import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param dto - Campaign creation payload
   * @returns The newly created campaign
   */
  async create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        targetLanguages: dto.targetLanguages ?? [],
        sourceLanguage: dto.sourceLanguage ?? 'en',
      },
    });
  }

  /**
   * @param query - Pagination, status filter, and search parameters
   * @returns Paginated list of campaigns with content piece counts
   */
  async findAll(query: CampaignQueryDto) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CampaignWhereInput = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { contentPieces: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * @param id - Campaign UUID
   * @returns Campaign with all nested content pieces and their draft summaries
   * @throws NotFoundException if campaign does not exist
   */
  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        contentPieces: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { aiDrafts: true } },
            aiDrafts: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, reviewState: true, provider: true, taskType: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }

    return campaign;
  }

  /**
   * @param id - Campaign UUID
   * @param dto - Fields to update
   * @returns Updated campaign
   * @throws NotFoundException if campaign does not exist
   */
  async update(id: string, dto: UpdateCampaignDto) {
    await this.ensureExists(id);
    return this.prisma.campaign.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Soft-deletes a campaign by setting its status to archived.
   * @param id - Campaign UUID
   * @returns Archived campaign
   * @throws NotFoundException if campaign does not exist
   */
  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  private async ensureExists(id: string) {
    const count = await this.prisma.campaign.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }
  }
}
