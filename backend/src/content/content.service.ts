import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentPiece } from './content-piece.entity';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentPiece)
    private readonly contentRepository: Repository<ContentPiece>,
  ) {}

  async create(
    campaignId: string,
    payload: CreateContentPieceDto,
  ): Promise<ContentPiece> {
    const contentPiece = this.contentRepository.create({
      campaignId,
      type: payload.type,
      title: payload.title,
      originalText: payload.originalText,
      aiDraft: payload.aiDraft,
      translations: payload.translations,
      reviewState: payload.reviewState,
      metadata: payload.metadata,
    });

    return this.contentRepository.save(contentPiece);
  }

  async findOne(id: string): Promise<ContentPiece> {
    const contentPiece = await this.contentRepository.findOne({
      where: { id },
      relations: ['campaign'],
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece ${id} not found`);
    }

    return contentPiece;
  }

  async update(
    id: string,
    payload: UpdateContentPieceDto,
  ): Promise<ContentPiece> {
    const contentPiece = await this.findOne(id);

    Object.assign(contentPiece, {
      type: payload.type ?? contentPiece.type,
      title: payload.title ?? contentPiece.title,
      originalText: payload.originalText ?? contentPiece.originalText,
      aiDraft: payload.aiDraft ?? contentPiece.aiDraft,
      translations: payload.translations ?? contentPiece.translations,
      reviewState: payload.reviewState ?? contentPiece.reviewState,
      metadata: payload.metadata ?? contentPiece.metadata,
    });

    return this.contentRepository.save(contentPiece);
  }

  async remove(id: string): Promise<void> {
    const result = await this.contentRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Content piece ${id} not found`);
    }
  }
}
