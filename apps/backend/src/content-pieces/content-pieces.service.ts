import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentPiece } from './content-piece.entity';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class ContentPiecesService {
  constructor(
    @InjectRepository(ContentPiece)
    private readonly contentPieceRepository: Repository<ContentPiece>,
    private readonly pubSub: PubSub,
  ) {}

  async create(createContentPieceDto: CreateContentPieceDto): Promise<ContentPiece> {
    const entity = this.contentPieceRepository.create(createContentPieceDto);
    const newContent = await this.contentPieceRepository.save(entity);

    await this.pubSub.publish('onContentPieceUpdated', {
      onContentPieceUpdated: {
        ...newContent,
        campaignId: newContent.campaign.id,
      },
    });
    return newContent;
  }

  async findAll(campaignId: string | undefined = undefined): Promise<ContentPiece[]> {
    if (campaignId) {
      return this.contentPieceRepository.find({
        where: { campaign: { id: campaignId } },
        relations: ['campaign', 'translations'],
      });
    }

    return this.contentPieceRepository.find({ relations: ['campaign', 'translations'] });
  }

  async findOne(id: string): Promise<ContentPiece> {
    const contentPiece = await this.contentPieceRepository.findOne({
      where: { id },
      relations: ['campaign', 'translations'],
    });
    if (!contentPiece) {
      throw new NotFoundException(`ContentPiece with ID ${id} not found`);
    }
    return contentPiece;
  }

  async update(id: string, updateContentPieceDto: UpdateContentPieceDto): Promise<ContentPiece> {
    const contentPiece = await this.findOne(id);
    this.contentPieceRepository.merge(contentPiece, updateContentPieceDto);
    const updatedContentPiece = await this.contentPieceRepository.save(contentPiece);

    await this.pubSub.publish('onContentPieceUpdated', {
      onContentPieceUpdated: {
        ...updatedContentPiece,
        campaignId: updatedContentPiece.campaign.id,
      },
    });
    return updatedContentPiece;
  }

  async remove(id: string): Promise<void> {
    const contentPiece = await this.findOne(id);
    if (!contentPiece) {
      throw new NotFoundException(`ContentPiece with ID ${id} not found`);
    }
    await this.contentPieceRepository.delete(id);

    await this.pubSub.publish('onContentPieceUpdated', {
      onContentPieceUpdated: {
        id,
        campaignId: contentPiece.campaign.id,
      },
    });
  }
}
