import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentPieceTranslation } from './content-piece-translation.entity';
import { CreateContentPieceTranslationDto } from './dto/create-content-piece-translation.dto';
import { UpdateContentPieceTranslationDto } from './dto/update-content-piece-translation.dto';
import { ContentPiece } from 'src/content-pieces/content-piece.entity';

@Injectable()
export class ContentPieceTranslationService {
  constructor(
    @InjectRepository(ContentPieceTranslation)
    private readonly translationRepository: Repository<ContentPieceTranslation>,
  ) {}

  async create(createTranslationDto: CreateContentPieceTranslationDto): Promise<ContentPieceTranslation> {
    const newTranslation = this.translationRepository.create(createTranslationDto);
    return this.translationRepository.save(newTranslation);
  }

  async findAll(contentPiece: ContentPiece | undefined = undefined): Promise<ContentPieceTranslation[]> {
    if (!contentPiece) {
      return this.translationRepository.find({ relations: ['contentPiece'] });
    }

    return this.translationRepository.find({ where: { contentPiece }, relations: ['contentPiece'] });
  }

  async findOne(id: string): Promise<ContentPieceTranslation> {
    const translation = await this.translationRepository.findOne({ where: { id }, relations: ['contentPiece'] });
    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }
    return translation;
  }

  async update(id: string, updateTranslationDto: UpdateContentPieceTranslationDto): Promise<ContentPieceTranslation> {
    const translation = await this.findOne(id);
    this.translationRepository.merge(translation, updateTranslationDto);
    return this.translationRepository.save(translation);
  }

  async remove(id: string): Promise<void> {
    const result = await this.translationRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }
  }
}
