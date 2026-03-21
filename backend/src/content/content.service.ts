import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma.service';
import {
  CreateContentPieceDto,
  UpdateContentPieceDto,
  UpdateStatusDto,
} from './content.dto';
import { validateStatusTransition } from './status-machine';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async create(campaignId: string, dto: CreateContentPieceDto) {
    const piece = await this.prisma.contentPiece.create({
      data: {
        campaignId,
        title: dto.title,
        body: dto.body ?? '',
        language: dto.language ?? 'en',
      },
    });
    this.events.emit('content.created', piece);
    return piece;
  }

  async findOne(id: string) {
    const piece = await this.prisma.contentPiece.findUnique({
      where: { id },
      include: { translations: true, campaign: true },
    });
    if (!piece) throw new NotFoundException(`Content piece ${id} not found`);
    return piece;
  }

  async update(id: string, dto: UpdateContentPieceDto) {
    const piece = await this.findOne(id);
    const updated = await this.prisma.contentPiece.update({
      where: { id },
      data: dto,
    });
    this.events.emit('content.updated', updated);
    return updated;
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    const piece = await this.findOne(id);
    validateStatusTransition(piece.status, dto.status);

    const updated = await this.prisma.contentPiece.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNotes: dto.reviewNotes ?? piece.reviewNotes,
      },
    });
    this.events.emit('content.statusChanged', updated);
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contentPiece.delete({ where: { id } });
  }
}
