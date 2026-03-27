import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { AIModel, ContentStatus } from '@prisma/client';

interface ChainInput {
  originalText: string;
  contentType: string;
}

interface ChainOutput extends ChainInput {
  generatedText: string;
  translatedText: string;
  summary: string;
}

@Injectable()
export class LangchainService {
  private readonly logger = new Logger(LangchainService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async runChain(
    contentPieceId: string,
    targetLanguage: string,
    model: AIModel = AIModel.CLAUDE_3_5_SONNET,
  ) {
    this.logger.log(`Running LangChain pipeline for content piece ${contentPieceId} → ${targetLanguage} (${model})`);

    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      include: { campaign: true },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece "${contentPieceId}" not found`);
    }

    const llm = this.buildLlm(model);
    const parser = new StringOutputParser();

    const generatePrompt = ChatPromptTemplate.fromMessages([
      [
        'human',
        `You are a creative content specialist for international marketing campaigns.\n` +
          `Generate a compelling marketing draft for the following {contentType} content:\n` +
          `"{originalText}"\n\n` +
          `Return only the generated marketing text, no extra commentary.`,
      ],
    ]);

    const translatePrompt = ChatPromptTemplate.fromMessages([
      [
        'human',
        `Translate the following marketing content to {targetLanguage}.\n` +
          `Preserve the original tone and brand voice.\n\n` +
          `Text to translate:\n"{generatedText}"\n\n` +
          `Return only the translated text, no extra commentary.`,
      ],
    ]);

    const summarizePrompt = ChatPromptTemplate.fromMessages([
      [
        'human',
        `You are a strategic marketing advisor.\n` +
          `Review this marketing content and its {targetLanguage} translation, then provide a brief strategic insight (2-3 sentences).\n\n` +
          `Original draft:\n"{generatedText}"\n\n` +
          `Translation:\n"{translatedText}"\n\n` +
          `Return only the strategic insight, no extra commentary.`,
      ],
    ]);

    const chain = RunnableSequence.from([
      RunnableLambda.from(async (input: ChainInput) => {
        const prompt = await generatePrompt.formatMessages({ ...input });
        const response = await llm.invoke(prompt);
        return { ...input, generatedText: await parser.parse(response.content as string) };
      }),
      RunnableLambda.from(async (input) => {
        const prompt = await translatePrompt.formatMessages({ ...input, targetLanguage });
        const response = await llm.invoke(prompt);
        return { ...input, translatedText: await parser.parse(response.content as string) };
      }),
      RunnableLambda.from(async (input) => {
        const prompt = await summarizePrompt.formatMessages({ ...input, targetLanguage });
        const response = await llm.invoke(prompt);
        return { ...input, summary: await parser.parse(response.content as string) };
      }),
    ]);

    const result: ChainOutput = await chain.invoke({
      originalText: contentPiece.originalText,
      contentType: contentPiece.type,
    });

    const draft = await this.prisma.aIDraft.create({
      data: {
        contentPieceId,
        model,
        prompt: `LangChain pipeline — generate marketing draft for ${contentPiece.type}`,
        generatedText: result.generatedText,
        keywords: [],
        isSelected: false,
      },
    });

    const translation = await this.prisma.translation.create({
      data: {
        contentPieceId,
        targetLanguage,
        translatedText: result.translatedText,
        model,
        status: ContentStatus.AI_SUGGESTED,
      },
    });

    if (contentPiece.status === ContentStatus.DRAFT) {
      await this.prisma.contentPiece.update({
        where: { id: contentPieceId },
        data: { status: ContentStatus.AI_SUGGESTED },
      });
    }

    this.eventsGateway.emitDraftGenerated(contentPiece.campaignId, draft);
    this.eventsGateway.emitTranslationCreated(contentPiece.campaignId, translation);

    return {
      draft,
      translation,
      summary: result.summary,
      targetLanguage,
    };
  }

  private buildLlm(model: AIModel): ChatAnthropic | ChatOpenAI {
    if (model === AIModel.GPT_4O) {
      return new ChatOpenAI({
        model: 'gpt-4o',
        apiKey: this.config.get<string>('OPENAI_API_KEY'),
        maxTokens: 1024,
      });
    }

    return new ChatAnthropic({
      model: 'claude-3-5-sonnet-20251001',
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
      maxTokens: 1024,
    });
  }
}
