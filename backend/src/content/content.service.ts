import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param campaignId - Parent campaign UUID
   * @param dto - Content piece creation payload
   * @returns Newly created content piece
   * @throws NotFoundException if campaign does not exist
   */
  async create(campaignId: string, dto: CreateContentPieceDto) {
    await this.ensureCampaignExists(campaignId);

    return this.prisma.contentPiece.create({
      data: {
        campaignId,
        type: dto.type,
        originalText: dto.originalText,
        language: dto.language ?? 'en',
      },
    });
  }

  /**
   * @param campaignId - Parent campaign UUID
   * @returns All content pieces for the campaign
   */
  async findByCampaign(campaignId: string) {
    await this.ensureCampaignExists(campaignId);

    return this.prisma.contentPiece.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { aiDrafts: true } },
        aiDrafts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, reviewState: true, provider: true },
        },
      },
    });
  }

  /**
   * @param id - Content piece UUID
   * @returns Content piece with all its AI drafts
   * @throws NotFoundException if not found
   */
  async findOne(id: string) {
    const piece = await this.prisma.contentPiece.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, name: true, targetLanguages: true, sourceLanguage: true } },
        aiDrafts: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!piece) {
      throw new NotFoundException(`Content piece with id "${id}" not found`);
    }

    return piece;
  }

  /**
   * @param id - Content piece UUID
   * @param dto - Fields to update
   * @returns Updated content piece
   * @throws NotFoundException if not found
   */
  async update(id: string, dto: UpdateContentPieceDto) {
    await this.ensureExists(id);
    return this.prisma.contentPiece.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * @param id - Content piece UUID
   * @returns Deleted content piece
   * @throws NotFoundException if not found
   */
  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.contentPiece.delete({ where: { id } });
  }

  private async ensureCampaignExists(campaignId: string) {
    const count = await this.prisma.campaign.count({ where: { id: campaignId } });
    if (count === 0) {
      throw new NotFoundException(`Campaign with id "${campaignId}" not found`);
    }
  }

  private async ensureExists(id: string) {
    const count = await this.prisma.contentPiece.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`Content piece with id "${id}" not found`);
    }
  }
}
