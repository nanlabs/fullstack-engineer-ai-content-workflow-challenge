import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { AIDraft, AIModel, ContentStatus, ContentType, Translation } from '@prisma/client';

interface AiDraftResponse {
  generatedText: string;
  keywords: string[];
  tone: string;
  sentiment: string;
}

interface AiTranslationResponse {
  translatedText: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private readonly anthropic: Anthropic;
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });

    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Generates a single AI draft for the given content piece using the
   * specified model (defaults to CLAUDE_3_5_SONNET).
   *
   * Steps:
   *  1. Fetch the content piece and its campaign.
   *  2. Build a structured prompt tailored to the content type.
   *  3. Call the appropriate AI provider.
   *  4. Parse the JSON response and persist an AIDraft record.
   *  5. Update the content piece status to AI_SUGGESTED.
   *  6. Emit a `draft:generated` WebSocket event.
   */
  async generateDraft(
    contentPieceId: string,
    model: AIModel = AIModel.CLAUDE_3_5_SONNET,
    customPrompt?: string,
  ): Promise<AIDraft> {
    this.logger.log(`Generating ${model} draft for content piece ${contentPieceId}`);

    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      include: { campaign: true },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece "${contentPieceId}" not found`);
    }

    const prompt = customPrompt ?? this.buildDraftPrompt(contentPiece.type, contentPiece.originalText);
    const systemPrompt = this.buildSystemPrompt(contentPiece.type);

    let parsed: AiDraftResponse;
    try {
      parsed = await this.callAiProvider<AiDraftResponse>(model, systemPrompt, prompt);
    } catch (err) {
      this.logger.error(`AI provider ${model} failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        `AI provider "${model}" failed to generate a draft: ${err.message}`,
      );
    }

    // Persist draft
    const draft = await this.prisma.aIDraft.create({
      data: {
        contentPieceId,
        model,
        prompt,
        generatedText: parsed.generatedText,
        keywords: parsed.keywords ?? [],
        tone: parsed.tone ?? null,
        sentiment: parsed.sentiment ?? null,
        isSelected: false,
      },
    });

    // Advance content piece status to AI_SUGGESTED if still in DRAFT
    if (contentPiece.status === ContentStatus.DRAFT) {
      await this.prisma.contentPiece.update({
        where: { id: contentPieceId },
        data: { status: ContentStatus.AI_SUGGESTED },
      });
    }

    this.eventsGateway.emitDraftGenerated(contentPiece.campaignId, draft);

    return draft;
  }

  /**
   * Translates the selected draft (or originalText if no draft is selected) of
   * a content piece into the specified target language.
   *
   * Steps:
   *  1. Fetch the content piece with its AI drafts.
   *  2. Determine the source text (selected draft > originalText).
   *  3. Call the AI provider for a brand-voice-preserving translation.
   *  4. Persist a Translation record.
   *  5. Emit a `translation:created` WebSocket event.
   */
  async translateContent(
    contentPieceId: string,
    targetLanguage: string,
    model: AIModel = AIModel.CLAUDE_3_5_SONNET,
  ): Promise<Translation> {
    this.logger.log(`Translating content piece ${contentPieceId} to ${targetLanguage} using ${model}`);

    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      include: {
        campaign: true,
        aiDrafts: { where: { isSelected: true } },
      },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece "${contentPieceId}" not found`);
    }

    const selectedDraft = contentPiece.aiDrafts[0];
    const sourceText = selectedDraft?.generatedText ?? contentPiece.originalText;
    const sourceTone = selectedDraft?.tone ?? 'professional';

    const systemPrompt = this.buildTranslationSystemPrompt();
    const userPrompt = this.buildTranslationPrompt(sourceText, targetLanguage, sourceTone);

    let parsed: AiTranslationResponse;
    try {
      parsed = await this.callAiProvider<AiTranslationResponse>(model, systemPrompt, userPrompt);
    } catch (err) {
      this.logger.error(`Translation failed with ${model}: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        `AI provider "${model}" failed to translate content: ${err.message}`,
      );
    }

    const translation = await this.prisma.translation.create({
      data: {
        contentPieceId,
        targetLanguage,
        translatedText: parsed.translatedText,
        model,
        status: ContentStatus.AI_SUGGESTED,
      },
    });

    this.eventsGateway.emitTranslationCreated(contentPiece.campaignId, translation);

    return translation;
  }

  /**
   * Generates drafts from BOTH Claude and GPT-4o in parallel and returns them
   * for side-by-side comparison.
   */
  async compareModels(
    contentPieceId: string,
    customPrompt?: string,
  ): Promise<{ claude: AIDraft; gpt4o: AIDraft }> {
    this.logger.log(`Comparing models for content piece ${contentPieceId}`);

    const [claude, gpt4o] = await Promise.all([
      this.generateDraft(contentPieceId, AIModel.CLAUDE_3_5_SONNET, customPrompt),
      this.generateDraft(contentPieceId, AIModel.GPT_4O, customPrompt),
    ]);

    return { claude, gpt4o };
  }

  // ---------------------------------------------------------------------------
  // Private helpers — prompt builders
  // ---------------------------------------------------------------------------

  /**
   * Builds a system prompt tailored to the content type.
   */
  private buildSystemPrompt(type: ContentType): string {
    const typeDescriptions: Record<ContentType, string> = {
      [ContentType.HEADLINE]: 'attention-grabbing headlines that immediately communicate value',
      [ContentType.DESCRIPTION]: 'compelling descriptions that engage the audience and highlight key benefits',
      [ContentType.CTA]: 'persuasive calls-to-action that drive immediate user engagement',
      [ContentType.TAGLINE]: 'memorable taglines that capture brand essence in a few words',
      [ContentType.BODY_COPY]: 'engaging body copy that tells a story and connects with the target audience',
    };

    return (
      `You are a creative content specialist for international marketing campaigns at ACME Global Media. ` +
      `Your expertise is crafting ${typeDescriptions[type]}. ` +
      `Always respond with a valid JSON object only — no markdown, no code fences, no extra text.`
    );
  }

  /**
   * Builds the user prompt for draft generation.
   */
  private buildDraftPrompt(type: ContentType, originalText: string): string {
    const typeLabel = type.replace('_', ' ').toLowerCase();
    return (
      `Generate a compelling ${typeLabel} for the following content:\n"${originalText}"\n\n` +
      `Respond with a JSON object in exactly this shape:\n` +
      `{\n` +
      `  "generatedText": "the generated content here",\n` +
      `  "keywords": ["keyword1", "keyword2", "keyword3"],\n` +
      `  "tone": "professional|casual|energetic|inspirational|urgent|friendly",\n` +
      `  "sentiment": "positive|neutral|negative"\n` +
      `}`
    );
  }

  private buildTranslationSystemPrompt(): string {
    return (
      `You are a professional translator and localization specialist for ACME Global Media. ` +
      `Your translations preserve the original tone, brand voice, cultural nuance, and marketing intent. ` +
      `Always respond with a valid JSON object only — no markdown, no code fences, no extra text.`
    );
  }

  /**
   * Builds the user prompt for translation requests.
   */
  private buildTranslationPrompt(
    sourceText: string,
    targetLanguage: string,
    tone: string,
  ): string {
    return (
      `Translate the following marketing content to ${targetLanguage}.\n` +
      `Preserve the original tone (${tone}) and brand voice.\n\n` +
      `Source text:\n"${sourceText}"\n\n` +
      `Respond with a JSON object in exactly this shape:\n` +
      `{\n` +
      `  "translatedText": "the translated content here"\n` +
      `}`
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers — AI provider dispatch
  // ---------------------------------------------------------------------------

  /**
   * Dispatches to Claude or GPT-4o and returns the parsed JSON response.
   */
  private async callAiProvider<T>(
    model: AIModel,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<T> {
    switch (model) {
      case AIModel.CLAUDE_3_5_SONNET:
        return this.callClaude<T>(systemPrompt, userPrompt);
      case AIModel.GPT_4O:
        return this.callGpt4o<T>(systemPrompt, userPrompt);
      default:
        throw new BadRequestException(`Unsupported AI model: ${model}`);
    }
  }

  /**
   * Calls the Anthropic Claude 3.5 Sonnet API and returns the parsed JSON response.
   */
  private async callClaude<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new InternalServerErrorException('Claude returned an empty response');
    }

    return this.parseJsonResponse<T>(textBlock.text, 'Claude');
  }

  /**
   * Calls the OpenAI GPT-4o API with JSON mode enabled and returns the parsed response.
   */
  private async callGpt4o<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new InternalServerErrorException('GPT-4o returned an empty response');
    }

    return this.parseJsonResponse<T>(content, 'GPT-4o');
  }

  /**
   * Safely parses a JSON string. Strips accidental markdown code fences if present.
   */
  private parseJsonResponse<T>(raw: string, providerName: string): T {
    // Strip markdown code fences that some models include despite instructions
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      this.logger.error(`${providerName} returned non-JSON content: ${raw}`);
      throw new InternalServerErrorException(
        `${providerName} returned an unexpected response format`,
      );
    }
  }
}
