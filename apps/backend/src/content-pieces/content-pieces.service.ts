import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentPiece } from './content-piece.entity';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';

@Injectable()
export class ContentPiecesService {
  constructor(
    @InjectRepository(ContentPiece)
    private readonly contentPieceRepository: Repository<ContentPiece>,
  ) {}

  async create(createContentPieceDto: CreateContentPieceDto): Promise<ContentPiece> {
    const newContentPiece = this.contentPieceRepository.create(createContentPieceDto);
    return this.contentPieceRepository.save(newContentPiece);
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
    return this.contentPieceRepository.save(contentPiece);
  }

  async remove(id: string): Promise<void> {
    const result = await this.contentPieceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`ContentPiece with ID ${id} not found`);
    }
  }
}
