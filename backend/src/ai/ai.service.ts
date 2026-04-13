import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { buildGenerationChain, GenerationInput } from './chains/generation.chain';
import { buildTranslationChain, TranslationInput } from './chains/translation.chain';
import { buildExtractionChain, ExtractionInput } from './chains/extraction.chain';
import { ProviderChoice } from './dto/generate.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiProvider: OpenAiProvider,
    private readonly anthropicProvider: AnthropicProvider,
  ) {}

  /**
   * Generates AI content for a content piece.
   * @param contentPieceId - UUID of the content piece
   * @param provider - Which AI provider(s) to use
   * @param options - Optional tone/style parameters
   * @returns Array of created AI drafts (1 for single provider, 2 for "both")
   * @throws NotFoundException if content piece not found
   * @throws BadRequestException if selected provider is not configured
   */
  async generate(
    contentPieceId: string,
    provider: ProviderChoice,
    options?: { tone?: string; style?: string },
  ) {
    const contentPiece = await this.getContentPieceWithCampaign(contentPieceId);
    const { campaign } = contentPiece;

    const input: GenerationInput = {
      campaignName: campaign.name,
      campaignDescription: campaign.description || '',
      contentType: contentPiece.type,
      language: contentPiece.language,
      existingText: contentPiece.originalText || undefined,
      tone: options?.tone,
      style: options?.style,
    };

    if (provider === 'both') {
      const results = await Promise.allSettled([
        this.runGeneration(input, 'openai'),
        this.runGeneration(input, 'anthropic'),
      ]);

      const drafts = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const draft = await this.saveDraft(contentPieceId, result.value);
          drafts.push(draft);
        } else {
          this.logger.warn(`Generation failed for one provider: ${result.reason}`);
        }
      }

      if (drafts.length === 0) {
        throw new BadRequestException('Generation failed for all providers.');
      }
      return drafts;
    }

    const result = await this.runGeneration(input, provider);
    const draft = await this.saveDraft(contentPieceId, result);
    return [draft];
  }

  /**
   * Translates content to one or more target languages.
   * @param contentPieceId - UUID of the content piece
   * @param targetLanguages - Array of ISO 639-1 language codes
   * @param providerName - Which AI provider to use
   * @returns Array of created AI drafts (one per target language)
   * @throws BadRequestException if content has no text to translate
   */
  async translate(
    contentPieceId: string,
    targetLanguages: string[],
    providerName: 'openai' | 'anthropic',
  ) {
    const contentPiece = await this.getContentPieceWithCampaign(contentPieceId);
    const sourceText = contentPiece.originalText;

    if (!sourceText) {
      throw new BadRequestException(
        'Content piece has no text to translate. Generate content first.',
      );
    }

    const { campaign } = contentPiece;
    const model = this.resolveModel(providerName);

    const chain = buildTranslationChain(model);
    const translations = await Promise.allSettled(
      targetLanguages.map(async (targetLanguage) => {
        const input: TranslationInput = {
          campaignName: campaign.name,
          campaignDescription: campaign.description || '',
          contentType: contentPiece.type,
          sourceLanguage: contentPiece.language,
          targetLanguage,
          sourceText,
        };

        const translatedText = await this.invokeWithRetry(() => chain.invoke(input));

        return this.prisma.aiDraft.create({
          data: {
            contentPieceId,
            provider: providerName as AiProvider,
            model: this.getModelName(providerName),
            taskType: 'translation',
            targetLanguage,
            generatedText: translatedText,
            reviewState: 'ai_suggested',
          },
        });
      }),
    );

    const drafts = translations
      .filter((r): r is PromiseFulfilledResult<never> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failures = translations.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(`${failures.length} translation(s) failed`);
    }

    return drafts;
  }

  /**
   * Extracts structured metadata (keywords, tone, sentiment) from content.
   * @param contentPieceId - UUID of the content piece
   * @param providerName - Which AI provider to use
   * @returns Extracted metadata object
   * @throws BadRequestException if content has no text to analyze
   */
  async extract(contentPieceId: string, providerName: 'openai' | 'anthropic' = 'openai') {
    const contentPiece = await this.getContentPieceWithCampaign(contentPieceId);
    const text = contentPiece.originalText;

    if (!text) {
      throw new BadRequestException('Content piece has no text to analyze.');
    }

    const model = this.resolveModel(providerName);
    const chain = buildExtractionChain(model);

    const input: ExtractionInput = {
      contentType: contentPiece.type,
      language: contentPiece.language,
      text,
    };

    const metadata = await this.invokeWithRetry(() => chain.invoke(input));

    await this.prisma.contentPiece.update({
      where: { id: contentPieceId },
      data: { metadata: JSON.parse(JSON.stringify(metadata)) },
    });

    return metadata;
  }

  /**
   * Runs the full pipeline: generate -> translate all target languages -> extract metadata.
   * @param contentPieceId - UUID of the content piece
   * @param providerName - Which AI provider to use
   * @returns Object with generation draft, translation drafts, and extracted metadata
   */
  async pipeline(contentPieceId: string, providerName: 'openai' | 'anthropic' = 'openai') {
    const contentPiece = await this.getContentPieceWithCampaign(contentPieceId);
    const { campaign } = contentPiece;

    const generationDrafts = await this.generate(contentPieceId, providerName);
    const generatedText = generationDrafts[0].generatedText;

    await this.prisma.contentPiece.update({
      where: { id: contentPieceId },
      data: { originalText: generatedText },
    });

    let translationDrafts: unknown[] = [];
    if (campaign.targetLanguages.length > 0) {
      translationDrafts = await this.translate(
        contentPieceId,
        campaign.targetLanguages,
        providerName,
      );
    }

    const metadata = await this.extract(contentPieceId, providerName);

    return {
      generation: generationDrafts[0],
      translations: translationDrafts,
      metadata,
    };
  }

  private async getContentPieceWithCampaign(id: string) {
    const piece = await this.prisma.contentPiece.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!piece) {
      throw new NotFoundException(`Content piece with id "${id}" not found`);
    }

    return piece;
  }

  private resolveModel(providerName: 'openai' | 'anthropic'): ChatOpenAI | ChatAnthropic {
    const provider = providerName === 'openai' ? this.openAiProvider : this.anthropicProvider;
    const model = provider.getModel();

    if (!model) {
      throw new BadRequestException(
        `Provider "${providerName}" is not configured. Set the API key in environment variables.`,
      );
    }

    return model;
  }

  private getModelName(providerName: 'openai' | 'anthropic'): string {
    return providerName === 'openai'
      ? this.openAiProvider.getModelName()
      : this.anthropicProvider.getModelName();
  }

  private async runGeneration(
    input: GenerationInput,
    providerName: 'openai' | 'anthropic',
  ): Promise<{ text: string; provider: AiProvider; model: string }> {
    const model = this.resolveModel(providerName);
    const chain = buildGenerationChain(model);
    const text = await this.invokeWithRetry(() => chain.invoke(input));

    return {
      text,
      provider: providerName as AiProvider,
      model: this.getModelName(providerName),
    };
  }

  private async saveDraft(
    contentPieceId: string,
    result: { text: string; provider: AiProvider; model: string },
  ) {
    return this.prisma.aiDraft.create({
      data: {
        contentPieceId,
        provider: result.provider,
        model: result.model,
        taskType: 'generation',
        generatedText: result.text,
        reviewState: 'ai_suggested',
      },
    });
  }

  /**
   * Retries an async operation with exponential backoff (max 3 attempts).
   */
  private async invokeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `AI call failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`,
        );

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new BadRequestException(`AI call failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}
