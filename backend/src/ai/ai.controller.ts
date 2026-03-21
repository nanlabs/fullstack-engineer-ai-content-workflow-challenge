import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ContentService } from '../content/content.service';
import { AiService } from './ai.service';
import { ContentWorkflow } from './content-workflow';
import { ModelFactory } from './model-factory.service';
import { AiGenerateDto, AiTranslateDto, AiChainDto } from './ai.dto';

@Controller()
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly contentWorkflow: ContentWorkflow,
    private readonly contentService: ContentService,
    private readonly modelFactory: ModelFactory,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  @Get('ai/providers')
  getProviders() {
    return {
      available: this.modelFactory.getAvailableProviders(),
      default: this.modelFactory.getDefaultProvider(),
    };
  }

  @Post('content/:id/generate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async generate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiGenerateDto,
  ) {
    const piece = await this.contentService.findOne(id);
    const campaign = piece.campaign;

    const body = await this.aiService.generateDraft({
      campaignName: campaign.name,
      campaignDescription: campaign.description ?? '',
      contentType: piece.type,
      title: piece.title,
      language: piece.language,
      provider: dto.model,
    });

    const updated = await this.prisma.contentPiece.update({
      where: { id },
      data: {
        body,
        status: ContentStatus.AI_SUGGESTED,
        aiModel: dto.model ?? this.modelFactory.getDefaultProvider(),
      },
    });

    this.events.emit('content.aiGenerated', updated);
    return updated;
  }

  @Post('content/:id/translate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async translate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiTranslateDto,
  ) {
    const piece = await this.contentService.findOne(id);
    const result = await this.aiService.translate({
      title: piece.title,
      body: piece.body,
      sourceLanguage: piece.language,
      targetLanguage: dto.targetLanguage,
      provider: dto.model,
    });

    const translation = await this.prisma.contentPiece.create({
      data: {
        campaignId: piece.campaignId,
        type: piece.type,
        title: result.title,
        body: result.body,
        language: dto.targetLanguage,
        status: ContentStatus.AI_SUGGESTED,
        aiModel: dto.model ?? this.modelFactory.getDefaultProvider(),
        parentId: piece.id,
      },
    });

    this.events.emit('content.translated', translation);
    return translation;
  }

  @Post('content/:id/extract')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async extract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiGenerateDto,
  ) {
    const piece = await this.contentService.findOne(id);
    const metadata = await this.aiService.extractMetadata({
      title: piece.title,
      body: piece.body,
      language: piece.language,
      provider: dto.model,
    });

    const updated = await this.prisma.contentPiece.update({
      where: { id },
      data: { metadata: metadata as any },
    });

    this.events.emit('content.metadataExtracted', updated);
    return updated;
  }

  @Post('content/:id/chain')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async chain(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiChainDto,
  ) {
    const piece = await this.contentService.findOne(id);
    const campaign = piece.campaign;

    const result = await this.contentWorkflow.runFullPipeline({
      campaignName: campaign.name,
      campaignDescription: campaign.description ?? '',
      contentType: piece.type,
      title: piece.title,
      language: piece.language,
      targetLanguages: campaign.targetLanguages,
      provider: dto.model,
    });

    // Update the original content piece
    const providerUsed = dto.model ?? this.modelFactory.getDefaultProvider();
    const updated = await this.prisma.contentPiece.update({
      where: { id },
      data: {
        body: result.generatedBody,
        status: ContentStatus.AI_SUGGESTED,
        aiModel: providerUsed,
        metadata: result.metadata as any,
      },
    });

    // Create translation content pieces
    const translations = [];
    for (const [lang, content] of Object.entries(result.translations)) {
      const translation = await this.prisma.contentPiece.create({
        data: {
          campaignId: piece.campaignId,
          type: piece.type,
          title: content.title,
          body: content.body,
          language: lang,
          status: ContentStatus.AI_SUGGESTED,
          aiModel: providerUsed,
          parentId: piece.id,
        },
      });
      translations.push(translation);
    }

    this.events.emit('content.chainCompleted', { piece: updated, translations });
    return { piece: updated, translations };
  }

  @Post('content/:id/compare')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async compare(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const piece = await this.contentService.findOne(id);
    const campaign = piece.campaign;

    const results = await this.aiService.compare({
      campaignName: campaign.name,
      campaignDescription: campaign.description ?? '',
      contentType: piece.type,
      title: piece.title,
      language: piece.language,
    });

    return { contentId: id, comparisons: results };
  }
}
