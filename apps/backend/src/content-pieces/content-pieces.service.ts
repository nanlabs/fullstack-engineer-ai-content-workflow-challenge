import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentPiece } from './content-piece.entity';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';
import { PubSub } from 'graphql-subscriptions';
import { LangChainService } from 'src/langchain/langchain.service';
import { ReviewState } from './review-state.enum';
import { ContentPieceTranslationService } from 'src/content-piece-translations/content-piece-translations.service';
import { ModelProvider } from 'src/langchain/langchain.enum';

@Injectable()
export class ContentPiecesService {
  constructor(
    @InjectRepository(ContentPiece)
    private readonly contentPieceRepository: Repository<ContentPiece>,
    private readonly translationsService: ContentPieceTranslationService,
    private readonly langChainService: LangChainService,
    private readonly pubSub: PubSub,
  ) {}

  async create(createContentPieceDto: CreateContentPieceDto): Promise<ContentPiece> {
    const entity = this.contentPieceRepository.create({
      sourceLanguage: createContentPieceDto.sourceLanguage,
      campaign: { id: createContentPieceDto.campaignId },
    });
    const newContent = await this.contentPieceRepository.save(entity);

    await this.pubSub.publish('contentPieceUpdated', {
      contentPieceUpdated: {
        ...newContent,
        campaignId: newContent.campaign.id,
        _type: 'create',
      },
    });
    return newContent;
  }

  async findAll(campaignId: string | undefined = undefined): Promise<ContentPiece[]> {
    if (campaignId) {
      return await this.contentPieceRepository.find({
        where: { campaign: { id: campaignId } },
        relations: ['campaign', 'translations'],
      });
    }

    return await this.contentPieceRepository.find({
      relations: ['campaign', 'translations'],
    });
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

    await this.pubSub.publish('contentPieceUpdated', {
      contentPieceUpdated: {
        ...updatedContentPiece,
        campaignId: updatedContentPiece.campaign.id,
        _type: 'update',
      },
    });
    return updatedContentPiece;
  }

  async remove(id: string): Promise<ContentPiece> {
    const contentPiece = await this.findOne(id);
    if (!contentPiece) {
      throw new NotFoundException(`ContentPiece with ID ${id} not found`);
    }
    await this.contentPieceRepository.delete(id);

    await this.pubSub.publish('contentPieceUpdated', {
      contentPieceUpdated: {
        ...contentPiece,
        id,
        campaignId: contentPiece.campaign.id,
        _type: 'remove',
      },
    });
    return contentPiece;
  }

  // generation info
  async generateForExistingContent(id: string, locale: string, modelProvider: ModelProvider): Promise<ContentPiece> {
    const contentPiece = await this.findOne(id);

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${id} not found`);
    }

    const existingTranslationIndex = contentPiece.translations.findIndex((t) => t.languageCode === locale);
    const existingTranslation = contentPiece.translations[existingTranslationIndex];

    const topic = `${contentPiece.campaign.name} ${contentPiece.campaign.name}`;
    if (existingTranslation) {
      // Update existing translation
      const generatedData = await this.langChainService.generateDraft(locale, topic, modelProvider);
      existingTranslation.translatedTitle = generatedData.title;
      existingTranslation.translatedDescription = generatedData.description;
      existingTranslation.isAIGenerated = true;
      existingTranslation.isHumanEdited = false;

      contentPiece.translations[existingTranslationIndex] = await this.translationsService.update(
        existingTranslation.id,
        existingTranslation,
      );
    } else {
      // Create new translation
      if (!contentPiece.translations || contentPiece.translations.length === 0) {
        contentPiece.translations = [];

        const generatedData = await this.langChainService.generateDraft(locale, topic, modelProvider);
        contentPiece.translations.push(
          await this.translationsService.create({
            modelProvider,
            campaignId: contentPiece.campaign.id,
            contentPieceId: contentPiece.id,
            languageCode: locale,
            translatedDescription: generatedData.description,
            translatedTitle: generatedData.title,
            isAIGenerated: true,
            isHumanEdited: false,
          }),
        );
      } else {
        // at this point we know there are existing translations, so we can use the first one as a base for translation
        const baseTranslation = contentPiece.translations[0];
        const generatedData = await this.langChainService.translateContent(
          locale,
          baseTranslation.translatedTitle,
          baseTranslation.translatedDescription,
          modelProvider,
        );
        contentPiece.translations.push(
          await this.translationsService.create({
            modelProvider,
            languageCode: locale,
            translatedTitle: generatedData.title,
            translatedDescription: generatedData.description,
            contentPieceId: contentPiece.id,
            campaignId: contentPiece.campaign.id,
            isAIGenerated: true,
            isHumanEdited: false,
          }),
        );
      }
    }
    contentPiece.reviewState = ReviewState.SuggestedByAI;
    return this.update(id, contentPiece);
  }

  /**
   * Method to create from scratch a new content piece and generate content for it
   *
   * create new content piece with the campaignId and use generateForExistingContent to generate content
   * @param campaignId
   * @param locale
   * @param modelProvider
   * @returns
   */
  async generateForNewContent(campaignId: string, locale: string, modelProvider: ModelProvider): Promise<ContentPiece> {
    const newContentPiece = await this.create({
      sourceLanguage: locale,
      campaignId,
    });
    return await this.generateForExistingContent(newContentPiece.id, locale, modelProvider);
  }
}
