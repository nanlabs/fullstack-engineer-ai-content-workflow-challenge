import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ReviewContentDto } from './dto/review-content.dto';
import { ContentPiece, ContentStatus } from '@prisma/client';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAllForCampaign(campaignId: string): Promise<ContentPiece[]> {
    this.logger.log(`Fetching content for campaign ${campaignId}`);
    await this.ensureCampaignExists(campaignId);

    return this.prisma.contentPiece.findMany({
      where: { campaignId },
      include: {
        aiDrafts: { orderBy: { createdAt: 'desc' } },
        translations: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(campaignId: string, id: string): Promise<ContentPiece> {
    this.logger.log(`Fetching content piece ${id}`);
    const content = await this.prisma.contentPiece.findFirst({
      where: { id, campaignId },
      include: {
        aiDrafts: { orderBy: { createdAt: 'desc' } },
        translations: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!content) {
      throw new NotFoundException(
        `Content piece "${id}" not found in campaign "${campaignId}"`,
      );
    }

    return content;
  }

  async create(campaignId: string, dto: CreateContentDto): Promise<ContentPiece> {
    this.logger.log(`Creating content piece in campaign ${campaignId}`);
    await this.ensureCampaignExists(campaignId);

    const content = await this.prisma.contentPiece.create({
      data: {
        campaignId,
        type: dto.type,
        originalText: dto.originalText,
        reviewNotes: dto.reviewNotes,
      },
      include: { aiDrafts: true, translations: true },
    });

    this.eventsGateway.emitContentUpdated(campaignId, content);
    return content;
  }

  async update(
    campaignId: string,
    id: string,
    dto: UpdateContentDto,
  ): Promise<ContentPiece> {
    this.logger.log(`Updating content piece ${id}`);
    await this.findOne(campaignId, id);

    const updated = await this.prisma.contentPiece.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.originalText !== undefined && { originalText: dto.originalText }),
        ...(dto.reviewNotes !== undefined && { reviewNotes: dto.reviewNotes }),
      },
      include: {
        aiDrafts: { orderBy: { createdAt: 'desc' } },
        translations: { orderBy: { createdAt: 'desc' } },
      },
    });

    this.eventsGateway.emitContentUpdated(campaignId, updated);
    return updated;
  }

  async remove(campaignId: string, id: string): Promise<void> {
    this.logger.log(`Deleting content piece ${id}`);
    await this.findOne(campaignId, id);
    await this.prisma.contentPiece.delete({ where: { id } });
  }

  async review(
    campaignId: string,
    id: string,
    dto: ReviewContentDto,
  ): Promise<ContentPiece> {
    this.logger.log(`Reviewing content piece ${id} -> ${dto.status}`);
    await this.findOne(campaignId, id);

    const updated = await this.prisma.contentPiece.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.reviewNotes !== undefined && { reviewNotes: dto.reviewNotes }),
      },
      include: {
        aiDrafts: { orderBy: { createdAt: 'desc' } },
        translations: { orderBy: { createdAt: 'desc' } },
      },
    });

    this.eventsGateway.emitContentUpdated(campaignId, updated);
    return updated;
  }

  // Deselects all drafts for the content piece then marks the chosen one as selected
  async selectDraft(
    campaignId: string,
    contentId: string,
    draftId: string,
  ): Promise<ContentPiece> {
    this.logger.log(`Selecting draft ${draftId} for content ${contentId}`);
    await this.findOne(campaignId, contentId);

    const draftExists = await this.prisma.aIDraft.findFirst({
      where: { id: draftId, contentPieceId: contentId },
    });

    if (!draftExists) {
      throw new NotFoundException(
        `AI draft "${draftId}" not found for content piece "${contentId}"`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.aIDraft.updateMany({
        where: { contentPieceId: contentId },
        data: { isSelected: false },
      }),
      this.prisma.aIDraft.update({
        where: { id: draftId },
        data: { isSelected: true },
      }),
    ]);

    const updated = await this.findOne(campaignId, contentId);
    this.eventsGateway.emitContentUpdated(campaignId, updated);
    return updated;
  }

  private async ensureCampaignExists(campaignId: string): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${campaignId}" not found`);
    }
  }
}
