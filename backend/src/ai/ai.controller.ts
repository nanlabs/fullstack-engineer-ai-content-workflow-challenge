import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ContentService } from '../content/content.service';
import { AiService } from './ai.service';
import { ContentWorkflow } from './content-workflow';
import { ModelFactory } from './model-factory.service';
import { AiGenerateDto, AiTranslateDto, AiChainDto, AiCompareDto } from './ai.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('AI')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'List available LLM providers and default' })
  getProviders() {
    return {
      all: this.modelFactory.getAllProviders(),
      available: this.modelFactory.getAvailableProviders(),
      default: this.modelFactory.getDefaultProvider(),
    };
  }

  @Post('content/:id/generate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'AI: Generate draft content' })
  async generate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiGenerateDto,
    @Request() req: any,
  ) {
    const piece = await this.contentService.findOne(id, req.user.id);
    const campaign = piece.campaign;

    let body: string;
    try {
      body = await this.aiService.generateDraft({
        campaignName: campaign.name,
        campaignDescription: campaign.description ?? '',
        title: piece.title,
        language: piece.language,
        userPrompt: dto.prompt,
        wordCount: dto.wordCount,
        provider: dto.model,
      });
    } catch (err) {
      throw this.wrapAiError(err);
    }

    const updated = await this.prisma.contentPiece.update({
      where: { id },
      data: {
        body,
        status: ContentStatus.AI_SUGGESTED,
        aiModel: dto.model ?? this.modelFactory.getDefaultProvider(),
      },
    });

    this.events.emit('content.aiGenerated', { ...updated, userId: req.user.id });
    return updated;
  }

  @Post('content/:id/translate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'AI: Translate content to target language' })
  async translate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiTranslateDto,
    @Request() req: any,
  ) {
    const piece = await this.contentService.findOne(id, req.user.id);
    let result;
    try {
      result = await this.aiService.translate({
        title: piece.title,
        body: piece.body,
        sourceLanguage: piece.language,
        targetLanguage: dto.targetLanguage,
        provider: dto.model,
      });
    } catch (err) {
      throw this.wrapAiError(err);
    }

    const providerUsed = dto.model ?? this.modelFactory.getDefaultProvider();
    const existingTranslation = await this.prisma.contentPiece.findFirst({
      where: { parentId: piece.id, language: dto.targetLanguage },
    });

    let translation;
    if (existingTranslation) {
      translation = await this.prisma.contentPiece.update({
        where: { id: existingTranslation.id },
        data: {
          title: result.title,
          body: result.body,
          status: ContentStatus.AI_SUGGESTED,
          aiModel: providerUsed,
        },
      });
    } else {
      translation = await this.prisma.contentPiece.create({
        data: {
          campaignId: piece.campaignId,
          title: result.title,
          body: result.body,
          language: dto.targetLanguage,
          status: ContentStatus.AI_SUGGESTED,
          aiModel: providerUsed,
          parentId: piece.id,
        },
      });
    }

    this.events.emit('content.translated', { ...translation, userId: req.user.id });
    return translation;
  }

  @Post('content/:id/extract')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'AI: Extract metadata (keywords, tone, summary)' })
  async extract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiGenerateDto,
    @Request() req: any,
  ) {
    const piece = await this.contentService.findOne(id, req.user.id);
    let metadata;
    try {
      metadata = await this.aiService.extractMetadata({
        title: piece.title,
        body: piece.body,
        language: piece.language,
        provider: dto.model,
      });
    } catch (err) {
      throw this.wrapAiError(err);
    }

    const updated = await this.prisma.contentPiece.update({
      where: { id },
      data: { metadata: metadata as any },
    });

    this.events.emit('content.metadataExtracted', { ...updated, userId: req.user.id });
    return updated;
  }

  @Post('content/:id/chain')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'AI: Full pipeline — generate, translate all, extract metadata' })
  async chain(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiChainDto,
    @Request() req: any,
  ) {
    const piece = await this.contentService.findOne(id, req.user.id);
    const campaign = piece.campaign;

    let result;
    try {
      result = await this.contentWorkflow.runFullPipeline({
        campaignName: campaign.name,
        campaignDescription: campaign.description ?? '',
        title: piece.title,
        language: piece.language,
        targetLanguages: campaign.targetLanguages,
        userPrompt: dto.prompt,
        wordCount: dto.wordCount,
        provider: dto.model,
      });
    } catch (err) {
      throw this.wrapAiError(err);
    }

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

    this.events.emit('content.chainCompleted', { piece: updated, translations, userId: req.user.id });
    return { piece: updated, translations };
  }

  @Post('content/:id/compare')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'AI: Compare draft generation across multiple models' })
  async compare(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiCompareDto,
    @Request() req: any,
  ) {
    const piece = await this.contentService.findOne(id, req.user.id);
    const campaign = piece.campaign;

    let results;
    try {
      results = await this.aiService.compare(
        {
          campaignName: campaign.name,
          campaignDescription: campaign.description ?? '',
          title: piece.title,
          language: piece.language,
          userPrompt: dto.prompt,
        },
        dto.models,
      );
    } catch (err) {
      throw this.wrapAiError(err);
    }

    return { contentId: id, comparisons: results };
  }

  private wrapAiError(err: unknown): HttpException {
    const message =
      err instanceof Error ? err.message : 'Unknown AI service error';
    let status: HttpStatus;
    if (message.includes('is not available')) {
      status = HttpStatus.BAD_REQUEST;
    } else if (message.includes('429') || message.includes('quota')) {
      status = HttpStatus.TOO_MANY_REQUESTS;
    } else {
      status = HttpStatus.BAD_GATEWAY;
    }
    return new HttpException(
      { statusCode: status, message: `AI provider error: ${message.slice(0, 300)}` },
      status,
    );
  }
}
