import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentPieceTranslation } from './content-piece-translations.entity';
import { CreateContentPieceTranslationDto } from './dto/create-content-piece-translations.dto';
import { UpdateContentPieceTranslationDto } from './dto/update-content-piece-translations.dto';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class ContentPieceTranslationService {
  constructor(
    @InjectRepository(ContentPieceTranslation)
    private readonly translationRepository: Repository<ContentPieceTranslation>,
    private readonly pubSub: PubSub,
  ) {}

  async create(createTranslationDto: CreateContentPieceTranslationDto): Promise<ContentPieceTranslation> {
    const translation = this.translationRepository.create({
      ...createTranslationDto,
      contentPiece: { id: createTranslationDto.contentPieceId },
    });
    const newTranslation = await this.translationRepository.save(translation);

    await this.pubSub.publish('contentPieceTranslationUpdated', {
      contentPieceTranslationUpdated: {
        ...newTranslation,
        campaignId: createTranslationDto.campaignId,
        contentPieceId: newTranslation.contentPiece.id,
        _type: 'create',
      },
    });
    return newTranslation;
  }

  async findAll(contentPieceId: string | undefined = undefined): Promise<ContentPieceTranslation[]> {
    if (!contentPieceId) {
      return this.translationRepository.find({ relations: ['contentPiece'] });
    }

    return this.translationRepository.find({
      where: {
        contentPiece: {
          id: contentPieceId,
        },
      },
      relations: ['contentPiece'],
    });
  }

  async findOne(id: string): Promise<ContentPieceTranslation> {
    const translation = await this.translationRepository.findOne({
      where: { id },
      relations: ['contentPiece', 'contentPiece.campaign'],
    });
    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }
    return translation;
  }

  async update(id: string, updateTranslationDto: UpdateContentPieceTranslationDto): Promise<ContentPieceTranslation> {
    const translation = await this.findOne(id);
    this.translationRepository.merge(translation, updateTranslationDto);
    const updatedTranslation = await this.translationRepository.save(translation);

    await this.pubSub.publish('contentPieceTranslationUpdated', {
      contentPieceTranslationUpdated: {
        ...updatedTranslation,
        campaignId: translation.contentPiece.campaign.id,
        contentPieceId: translation.contentPiece.id,
        _type: 'update',
      },
    });
    return updatedTranslation;
  }

  async remove(id: string): Promise<ContentPieceTranslation> {
    const translation = await this.translationRepository.findOne({ where: { id } });
    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }
    await this.translationRepository.remove(translation);

    await this.pubSub.publish('contentPieceTranslationUpdated', {
      contentPieceTranslationUpdated: {
        ...translation,
        id,
        campaignId: translation.contentPiece.campaign.id,
        contentPieceId: translation.contentPiece.id,
        _type: 'remove',
      },
    });
    return translation;
  }
}
