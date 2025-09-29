import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';
import { WebsocketsGateway } from '../websockets/websockets.gateway';

@Injectable()
export class ContentPiecesService {
  constructor(
    private prisma: PrismaService,
    private websocketsGateway: WebsocketsGateway,
  ) {}

  async create(createContentPieceDto: CreateContentPieceDto) {
    const contentPiece = await this.prisma.contentPiece.create({
      data: createContentPieceDto,
      include: {
        campaign: true,
        drafts: true,
      },
    });

    // Notify all connected clients about the new content piece
    this.websocketsGateway.notifyContentPieceCreated(contentPiece);

    return contentPiece;
  }

  async findAll() {
    return this.prisma.contentPiece.findMany({
      include: {
        campaign: true,
        drafts: true,
      },
    });
  }

  async findByCampaign(campaignId: string) {
    return this.prisma.contentPiece.findMany({
      where: { campaignId },
      include: {
        campaign: true,
        drafts: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.contentPiece.findUnique({
      where: { id },
      include: {
        campaign: true,
        drafts: true,
      },
    });
  }

  async update(id: string, updateContentPieceDto: UpdateContentPieceDto) {
    const contentPiece = await this.prisma.contentPiece.update({
      where: { id },
      data: updateContentPieceDto,
      include: {
        campaign: true,
        drafts: true,
      },
    });

    // Notify all connected clients about the content piece update
    this.websocketsGateway.notifyContentPieceUpdated(contentPiece);

    return contentPiece;
  }

  async remove(id: string) {
    const result = await this.prisma.contentPiece.delete({
      where: { id },
    });

    // Notify all connected clients about the content piece deletion
    this.websocketsGateway.notifyContentPieceDeleted(id);

    return result;
  }
}
