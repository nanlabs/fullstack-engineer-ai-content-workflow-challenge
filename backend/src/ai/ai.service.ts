import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';
import { ReviewStatus } from '../status-enum';
import { createModel } from './model.factory';
import { buildPiecesPrompt } from '../prompts/pieces.prompts';
import { buildContentPrompt } from '../prompts/localization.prompts';

type GeneratedPiece = {
  type: string;
  name?: string;
};

type ModelCandidate = {
  provider: string;
  model: string;
  client: any;
};

type AiErrorDetail = {
  provider: string;
  model: string;
  message: string;
};

type ProviderModel = {
  id: string;
  label: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly maxAttempts = 3;
  private readonly timeoutMs = 20_000;
  private readonly defaultPieces: GeneratedPiece[] = [
    { type: 'blog_post' },
    { type: 'instagram_post' },
    { type: 'email_newsletter' },
  ];

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ContentPiece)
    private readonly pieceRepo: Repository<ContentPiece>,
    @InjectRepository(ContentLocalization)
    private readonly localizationRepo: Repository<ContentLocalization>,
  ) {}

  async getModelsByProvider(provider: string): Promise<ProviderModel[]> {
    const normalizedProvider = provider.toLowerCase();

    if (normalizedProvider === 'openai') {
      return this.fetchOpenAiModels();
    }

    if (normalizedProvider === 'anthropic') {
      return this.fetchAnthropicModels();
    }

    throw new BadRequestException(`Unsupported provider "${provider}"`);
  }

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
        localizations.push(localization);
      }
    }

    await Promise.all(
      localizations.map((localization) =>
        this.generateLocalizationContentWithFallback(modelCandidates, campaign, localization),
      ),
    );
  }

  async generateContentPiecesWithFallback(
    models: ModelCandidate[],
    topic: string,
  ): Promise<GeneratedPiece[]> {
    const prompt = buildPiecesPrompt(topic);
    const errors: AiErrorDetail[] = [];

    for (const candidate of models) {
      try {
        const parsed = await this.invokeJsonWithRetry<{ pieces: GeneratedPiece[] }>(
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

  async generateLocalizationContentWithFallback(
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
        const parsed = await this.invokeJsonWithRetry<{ title?: string; body?: string }>(
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
        return this.localizationRepo.save(localization);
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

  private async invokeJsonWithRetry<T>(candidate: ModelCandidate, prompt: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = (await this.withTimeout(
          candidate.client.invoke(prompt),
          this.timeoutMs,
          `${candidate.provider}:${candidate.model}`,
        )) as { content: unknown };
        return this.parseModelJson<T>(response.content);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) {
          await this.sleep(400 * attempt);
        }
      }
    }

    throw lastError;
  }

  private parseModelJson<T>(content: unknown): T {
    if (typeof content === 'string') {
      return this.parseJsonString<T>(content);
    }

    if (Array.isArray(content)) {
      const merged = content
        .map((chunk) => {
          if (typeof chunk === 'string') {
            return chunk;
          }
          if (chunk && typeof chunk === 'object' && 'text' in chunk) {
            return String((chunk as { text: unknown }).text);
          }
          return '';
        })
        .join('');
      return this.parseJsonString<T>(merged);
    }

    throw new Error('Model response content is not valid JSON');
  }

  private parseJsonString<T>(raw: string): T {
    const trimmed = raw.trim();

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1]) as T;
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate) as T;
    }

    return JSON.parse(trimmed) as T;
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

  private mergeMetadata(current: any, next: Record<string, unknown>): Record<string, unknown> {
    return {
      ...(current ?? {}),
      ...next,
    };
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Timeout after ${ms}ms for ${label}`));
      }, ms);
    });

    try {
      return (await Promise.race([promise, timeoutPromise])) as T;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchOpenAiModels(): Promise<ProviderModel[]> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is missing on server');
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new ServiceUnavailableException(
        `Could not fetch OpenAI models (${response.status}): ${raw}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: string }>;
    };
    const models = (payload.data ?? [])
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id))
      .sort((a, b) => a.localeCompare(b))
      .map((id) => ({ id, label: id }));

    return models;
  }

  private async fetchAnthropicModels(): Promise<ProviderModel[]> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('ANTHROPIC_API_KEY is missing on server');
    }

    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new ServiceUnavailableException(
        `Could not fetch Anthropic models (${response.status}): ${raw}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: string; display_name?: string }>;
    };

    const models = (payload.data ?? [])
      .map((item) => ({
        id: item.id ?? '',
        label: item.display_name ?? item.id ?? '',
      }))
      .filter((item) => item.id.length > 0)
      .sort((a, b) => a.id.localeCompare(b.id));

    return models;
  }
}
