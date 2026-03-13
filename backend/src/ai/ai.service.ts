import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { ContentPiece } from '../content-piece/content-pieces.entity';
import { ContentLocalization } from '../content-localization/content-localizations.entity';
import { createModel } from './model.factory';
import { buildPiecesPrompt } from '../prompts/pieces.prompts';
import { buildContentPrompt } from '../prompts/localization.prompts';

type GeneratedPiece = {
  type: string;
  name?: string;
};

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(ContentPiece)
    private readonly pieceRepo: Repository<ContentPiece>,
    @InjectRepository(ContentLocalization)
    private readonly localizationRepo: Repository<ContentLocalization>,
  ) {}

  async generateCampaignContent(campaign: Campaign, languages: string[]): Promise<void> {
    const model = createModel(campaign.llmProvider, campaign.model);

    const pieces = await this.generateContentPieces(model, campaign.topic);

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
        });
        localizations.push(localization);
      }
    }

    await Promise.all(
      localizations.map((localization) =>
        this.generateLocalizationContent(model, campaign, localization),
      ),
    );
  }

  async generateContentPieces(model: any, topic: string): Promise<GeneratedPiece[]> {
    const prompt = buildPiecesPrompt(topic);
    const response = await model.invoke(prompt);
    const parsed = this.parseModelJson<{ pieces: GeneratedPiece[] }>(response.content);
    return parsed.pieces ?? [];
  }

  async generateLocalizationContent(
    model: any,
    campaign: Campaign,
    localization: ContentLocalization,
  ): Promise<ContentLocalization> {
    const piece = await this.pieceRepo.findOne({
      where: { id: localization.contentPiece.id },
    });

    if (!piece) {
      return localization;
    }

    const prompt = buildContentPrompt(campaign.topic, piece.type, localization.languageCode);
    const response = await model.invoke(prompt);
    const parsed = this.parseModelJson<{ title?: string; body?: string }>(response.content);

    localization.titleSuggestion = parsed.title ?? '';
    localization.bodySuggestion = parsed.body ?? '';

    return this.localizationRepo.save(localization);
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
}
