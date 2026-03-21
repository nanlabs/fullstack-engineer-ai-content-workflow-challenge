import { Injectable, Logger } from '@nestjs/common';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ModelFactory } from './model-factory.service';
import {
  generateDraftPrompt,
  translatePrompt,
  extractMetadataPrompt,
} from './prompts';

export interface GenerateInput {
  campaignName: string;
  campaignDescription: string;
  contentType: string;
  title: string;
  language: string;
  provider?: string;
}

export interface TranslateInput {
  title: string;
  body: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider?: string;
}

export interface ExtractInput {
  title: string;
  body: string;
  language: string;
  provider?: string;
}

export interface TranslationResult {
  title: string;
  body: string;
}

export interface MetadataResult {
  keywords: string[];
  tone: string;
  sentiment: string;
  readability: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly parser = new StringOutputParser();

  constructor(private readonly modelFactory: ModelFactory) {}

  async generateDraft(input: GenerateInput): Promise<string> {
    const model = this.modelFactory.getModel(input.provider);
    const chain = generateDraftPrompt.pipe(model).pipe(this.parser);
    const result = await chain.invoke({
      campaignName: input.campaignName,
      campaignDescription: input.campaignDescription || 'No description provided',
      contentType: input.contentType,
      title: input.title,
      language: input.language,
    });
    return result.trim();
  }

  async translate(input: TranslateInput): Promise<TranslationResult> {
    const model = this.modelFactory.getModel(input.provider);
    const chain = translatePrompt.pipe(model).pipe(this.parser);
    const result = await chain.invoke({
      title: input.title,
      body: input.body,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
    });

    return this.parseTranslation(result);
  }

  async extractMetadata(input: ExtractInput): Promise<MetadataResult> {
    const model = this.modelFactory.getModel(input.provider);
    const chain = extractMetadataPrompt.pipe(model).pipe(this.parser);
    const result = await chain.invoke({
      title: input.title,
      body: input.body,
      language: input.language,
    });

    return this.parseJson<MetadataResult>(result);
  }

  async compare(
    input: GenerateInput,
  ): Promise<Record<string, string>> {
    const providers = this.modelFactory.getAvailableProviders();
    const results = await Promise.all(
      providers.map(async (provider) => {
        const body = await this.generateDraft({ ...input, provider });
        return { provider, body };
      }),
    );
    return Object.fromEntries(results.map((r) => [r.provider, r.body]));
  }

  private parseTranslation(raw: string): TranslationResult {
    const titleMatch = raw.match(/TITLE:\s*(.+)/i);
    const bodyMatch = raw.match(/BODY:\s*([\s\S]+)/i);
    return {
      title: titleMatch?.[1]?.trim() ?? raw.split('\n')[0]?.trim() ?? '',
      body: bodyMatch?.[1]?.trim() ?? raw.trim(),
    };
  }

  private parseJson<T>(raw: string): T {
    const cleaned = raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  }
}
