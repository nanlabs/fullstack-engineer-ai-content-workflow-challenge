import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';
import { ReviewStatus } from '../status-enum';
import { buildContentPrompt } from '../prompts/localization.prompts';
import { buildPiecesPrompt } from '../prompts/pieces.prompts';
import { EventsService } from '../events/events.service';
import { createModel } from './model.factory';
import { AiInvokeService } from './ai-invoke.service';
import { AiErrorDetail, GeneratedPiece, ModelCandidate } from './ai.types';

@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);
  private readonly defaultPieces: GeneratedPiece[] = [
    { type: 'blog_post' },
    { type: 'instagram_post' },
    { type: 'email_newsletter' },
  ];

  constructor(
    private readonly eventsService: EventsService,
    private readonly aiInvokeService: AiInvokeService,
    @InjectRepository(ContentPiece)
    private readonly pieceRepo: Repository<ContentPiece>,
    @InjectRepository(ContentLocalization)
    private readonly localizationRepo: Repository<ContentLocalization>,
  ) {}

  async generateCampaignContent(campaign: Campaign, languages: string[]): Promise<void> {
    const modelCandidates = this.buildModelCandidates(campaign.llmProvider, campaign.model);
    let pieces = this.defaultPieces;
    let piecesError: AiErrorDetail[] | null = null;

    try {
      pieces = await this.generateContentPiecesWithFallback(modelCandidates, campaign.topic);
    } catch (error) {
      piecesError = this.extractErrorDetails(error);
      this.logger.warn(
        `Failed to generate pieces with AI. Falling back to defaults. ${JSON.stringify(piecesError)}`,
      );
    }

    const savedPieces: ContentPiece[] = [];

    for (const piece of pieces) {
      const saved = await this.pieceRepo.save({
        name: piece.name ?? piece.type,
        type: piece.type,
        campaign,
      });
      savedPieces.push(saved);
    }

    const localizations: ContentLocalization[] = [];

    for (const piece of savedPieces) {
      for (const language of languages) {
        const localization = await this.localizationRepo.save({
          languageCode: language,
          contentPiece: piece,
          aiMetadata: piecesError
            ? {
                piecesGenerationError: piecesError,
                updatedAt: new Date().toISOString(),
              }
            : null,
        });
        await this.eventsService.publish('content:processing', {
          campaignId: campaign.id,
          contentPieceId: piece.id,
          localizationId: localization.id,
          locale: language,
          status: ReviewStatus.DRAFT,
        });
        localizations.push(localization);
      }
    }

    await Promise.all(
      localizations.map((localization) =>
        this.generateLocalizationContentWithFallback(modelCandidates, campaign, localization),
      ),
    );
  }

  private async generateContentPiecesWithFallback(
    models: ModelCandidate[],
    topic: string,
  ): Promise<GeneratedPiece[]> {
    const prompt = buildPiecesPrompt(topic);
    const errors: AiErrorDetail[] = [];

    for (const candidate of models) {
      try {
        const parsed = await this.aiInvokeService.invokeJsonWithRetry<{ pieces: GeneratedPiece[] }>(
          candidate,
          prompt,
        );
        const pieces = parsed.pieces ?? [];
        if (pieces.length > 0) {
          return pieces;
        }
      } catch (error) {
        errors.push({
          provider: candidate.provider,
          model: candidate.model,
          message: this.getErrorMessage(error),
        });
      }
    }

    throw errors;
  }

  private async generateLocalizationContentWithFallback(
    models: ModelCandidate[],
    campaign: Campaign,
    localization: ContentLocalization,
  ): Promise<ContentLocalization> {
    const piece = await this.pieceRepo.findOne({
      where: { id: localization.contentPiece.id },
    });

    if (!piece) {
      localization.aiMetadata = this.mergeMetadata(localization.aiMetadata, {
        localizationGenerationError: {
          message: 'Content piece not found for localization',
          updatedAt: new Date().toISOString(),
        },
      });
      return this.localizationRepo.save(localization);
    }

    const prompt = buildContentPrompt(campaign.topic, piece.type, localization.languageCode);
    const errors: AiErrorDetail[] = [];

    for (const candidate of models) {
      try {
        const parsed = await this.aiInvokeService.invokeJsonWithRetry<{ title?: string; body?: string }>(
          candidate,
          prompt,
        );
        localization.titleSuggestion = parsed.title ?? '';
        localization.bodySuggestion = parsed.body ?? '';
        localization.status = ReviewStatus.AI_SUGGESTED;
        localization.aiMetadata = this.mergeMetadata(localization.aiMetadata, {
          generation: {
            provider: candidate.provider,
            model: candidate.model,
            fallbackUsed: candidate.provider !== campaign.llmProvider,
            updatedAt: new Date().toISOString(),
          },
        });
        const savedLocalization = await this.localizationRepo.save(localization);

        await this.eventsService.publish('content:suggested', {
          campaignId: campaign.id,
          contentPieceId: piece.id,
          localizationId: savedLocalization.id,
          locale: savedLocalization.languageCode,
          titleSuggestion: savedLocalization.titleSuggestion,
          bodySuggestion: savedLocalization.bodySuggestion,
          status: savedLocalization.status,
        });

        await this.eventsService.publish('status:change', {
          campaignId: campaign.id,
          contentPieceId: piece.id,
          localizationId: savedLocalization.id,
          locale: savedLocalization.languageCode,
          status: savedLocalization.status,
        });

        return savedLocalization;
      } catch (error) {
        errors.push({
          provider: candidate.provider,
          model: candidate.model,
          message: this.getErrorMessage(error),
        });
      }
    }

    localization.aiMetadata = this.mergeMetadata(localization.aiMetadata, {
      localizationGenerationError: {
        errors,
        updatedAt: new Date().toISOString(),
      },
    });
    return this.localizationRepo.save(localization);
  }

  private buildModelCandidates(provider: string, model: string): ModelCandidate[] {
    const candidates: ModelCandidate[] = [];
    const primaryProvider = provider.toLowerCase();

    this.pushModelCandidate(candidates, primaryProvider, model);

    return candidates;
  }

  private pushModelCandidate(target: ModelCandidate[], provider: string, model: string): void {
    try {
      target.push({
        provider,
        model,
        client: createModel(provider, model),
      });
    } catch (error) {
      this.logger.warn(
        `Skipping unsupported provider/model candidate ${provider}/${model}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private extractErrorDetails(error: unknown): AiErrorDetail[] {
    if (Array.isArray(error)) {
      return error.map((item) => ({
        provider:
          item && typeof item === 'object' && 'provider' in item
            ? String((item as { provider: unknown }).provider)
            : 'unknown',
        model:
          item && typeof item === 'object' && 'model' in item
            ? String((item as { model: unknown }).model)
            : 'unknown',
        message:
          item && typeof item === 'object' && 'message' in item
            ? String((item as { message: unknown }).message)
            : this.getErrorMessage(item),
      }));
    }
    return [{ provider: 'unknown', model: 'unknown', message: this.getErrorMessage(error) }];
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private mergeMetadata(current: unknown, next: Record<string, unknown>): Record<string, unknown> {
    return {
      ...((current ?? {}) as Record<string, unknown>),
      ...next,
    };
  }
}
