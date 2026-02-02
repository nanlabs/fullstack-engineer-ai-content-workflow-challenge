import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import OpenAI from 'openai';
import { Repository } from 'typeorm';
import { ContentPiece } from '../content/content-piece.entity';
import { ReviewState } from '../content/review-state.enum';
import { ContentEventsGateway } from '../websocket/content-events.gateway';
import { GenerateAiDraftDto } from './dto/generate-ai-draft.dto';
import { TranslateContentDto } from './dto/translate-content.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { ReviewDecision } from './review-decision.enum';

@Injectable()
export class AiService {
  private readonly client: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ContentPiece)
    private readonly contentRepository: Repository<ContentPiece>,
    private readonly eventsGateway: ContentEventsGateway,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for AI features');
    }

    this.client = new OpenAI({ apiKey });
  }

  async generateDraft(
    contentId: string,
    payload: GenerateAiDraftDto,
  ): Promise<ContentPiece> {
    const content = await this.findContent(contentId);

    const systemPrompt =
      'You are a helpful marketing copywriter. Provide a concise draft based on the original text. Return plain text only.';
    const userPrompt = [
      `Title: ${content.title}`,
      `Type: ${content.type}`,
      `Original: ${content.originalText}`,
      payload.tone ? `Tone: ${payload.tone}` : undefined,
      payload.instructions ? `Instructions: ${payload.instructions}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await this.client.responses.create({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const aiDraft = response.output_text?.trim();

    if (!aiDraft) {
      throw new BadRequestException('OpenAI response did not include a draft');
    }

    content.aiDraft = aiDraft;
    content.reviewState = ReviewState.AiSuggested;

    const saved = await this.contentRepository.save(content);
    this.eventsGateway.emitAiDraftGenerated(contentId, aiDraft);
    this.eventsGateway.emitReviewStateChanged(contentId, ReviewState.AiSuggested);
    return saved;
  }

  async translateContent(
    contentId: string,
    payload: TranslateContentDto,
  ): Promise<ContentPiece> {
    const content = await this.findContent(contentId);

    const translationTarget = payload.targetLanguages.join(', ');
    const sourceText = content.aiDraft ?? content.originalText;

    const systemPrompt =
      'You are a localization expert. Translate the content to requested locales. Respond with a JSON object keyed by locale.';
    const userPrompt = [
      `Title: ${content.title}`,
      `Type: ${content.type}`,
      `Locales: ${translationTarget}`,
      payload.instructions ? `Instructions: ${payload.instructions}` : undefined,
      `Text: ${sourceText}`,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await this.client.responses.create({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawOutput = response.output_text?.trim();

    if (!rawOutput) {
      throw new BadRequestException('OpenAI response did not include translations');
    }

    let parsedTranslations: Record<string, string>;

    try {
      parsedTranslations = JSON.parse(rawOutput) as Record<string, string>;
    } catch (error) {
      throw new BadRequestException('OpenAI response was not valid JSON');
    }

    content.translations = {
      ...(content.translations ?? {}),
      ...parsedTranslations,
    };

    const saved = await this.contentRepository.save(content);
    this.eventsGateway.emitContentUpdated(contentId, saved);
    return saved;
  }

  async submitReview(
    contentId: string,
    payload: SubmitReviewDto,
  ): Promise<ContentPiece> {
    const content = await this.findContent(contentId);

    if (payload.decision === ReviewDecision.Edit) {
      if (!payload.editedText) {
        throw new BadRequestException('editedText is required for EDIT');
      }

      content.aiDraft = payload.editedText;
      content.reviewState = ReviewState.InReview;
    }

    if (payload.decision === ReviewDecision.Approve) {
      content.reviewState = ReviewState.Approved;
    }

    if (payload.decision === ReviewDecision.Reject) {
      content.reviewState = ReviewState.Rejected;
    }

    if (payload.feedback) {
      content.metadata = {
        ...(content.metadata ?? {}),
        reviewFeedback: payload.feedback,
        reviewedAt: new Date().toISOString(),
      };
    }

    const saved = await this.contentRepository.save(content);
    this.eventsGateway.emitReviewStateChanged(contentId, saved.reviewState);
    this.eventsGateway.emitContentUpdated(contentId, saved);
    return saved;
  }

  private async findContent(id: string): Promise<ContentPiece> {
    const content = await this.contentRepository.findOne({ where: { id } });

    if (!content) {
      throw new NotFoundException(`Content piece ${id} not found`);
    }

    return content;
  }
}
