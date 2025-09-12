import { Injectable, BadRequestException } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from '@langchain/core/prompts';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ModelProvider } from './langchain.enum';

@Injectable()
export class LangChainService {
  private readonly openAILLM: ChatOpenAI;
  private readonly anthropicLLM: ChatAnthropic;

  constructor() {
    this.openAILLM = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.9,
      modelName: 'gpt-4o-mini',
      maxRetries: 1,
      maxTokens: 500,
    });
    this.anthropicLLM = new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      temperature: 0.7,
      modelName: 'claude-sonnet-4-20250514',
      maxRetries: 1,
      maxTokens: 500,
    });
  }

  private getModel(provider: ModelProvider): BaseLanguageModel {
    switch (provider) {
      case ModelProvider.OpenAI:
        return this.openAILLM;
      case ModelProvider.Anthropic:
        return this.anthropicLLM;
      default:
        throw new BadRequestException('Invalid AI model provider');
    }
  }

  /**
   * Generate a draft for a specific topic and language. The draft includes a title and description.
   *
   * @param sourceLanguage The language to generate content in.
   * @param topic The topic to generate content about.
   * @param modelProvider The model provider to use for generation.
   * @return The generated content.
   */
  async generateDraft(sourceLanguage: string, topic: string, modelProvider: ModelProvider) {
    const llm = this.getModel(modelProvider);

    const promptTemplate = PromptTemplate.fromTemplate(
      `Generate a short, engaging marketing headline and description. You can be inspired by {topic} in {sourceLanguage}.
        Return the result as a JSON object with "title" and "description" keys.
      `,
    );

    const chain = promptTemplate.pipe(llm).pipe(new JsonOutputParser());

    const result = await chain.invoke({
      topic,
      sourceLanguage,
    });

    try {
      const _parsed = result;
      if (!_parsed || typeof _parsed !== 'object') {
        throw new Error('Invalid response format');
      }
      const parsed = _parsed as { title: string; description: string };

      if (typeof parsed.title === 'string' && typeof parsed.description === 'string') {
        return parsed;
      }
      throw new Error('Invalid response format');
    } catch {
      throw new BadRequestException('Failed to parse AI response as JSON');
    }
  }

  // has to receive locale, baseTranslation.translatedTitle, baseTranslation.translatedDescription, modelProvider,
  //   and return { title: string; description: string }
  async translateContent(locale: string, title: string, description: string, modelProvider: ModelProvider) {
    const llm = this.getModel(modelProvider);

    const translatePrompt = PromptTemplate.fromTemplate(`Translate the following text into {locale}.
      title: "{title}". description: "{description}".
      Return the result as a JSON object with "title" and "description" keys.
    `);

    // Use LCEL again
    const translateChain = translatePrompt.pipe(llm).pipe(new JsonOutputParser());

    const result = await translateChain.invoke({
      title,
      description,
      locale,
    });

    try {
      const _parsed = result;
      if (!_parsed || typeof _parsed !== 'object') {
        throw new Error('Invalid response format');
      }
      const parsed = _parsed as { title: string; description: string };

      if (typeof parsed.title === 'string' && typeof parsed.description === 'string') {
        return parsed;
      }
      throw new Error('Invalid response format');
    } catch {
      throw new BadRequestException('Failed to parse AI response as JSON');
    }
  }
}
