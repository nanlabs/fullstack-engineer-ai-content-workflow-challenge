import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from '@langchain/core/prompts';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { StringOutputParser } from '@langchain/core/output_parsers';

export enum ModelProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
}

@Injectable()
export class LangChainService {
  private readonly openAILLM: OpenAI;
  private readonly anthropicLLM: ChatAnthropic;

  constructor() {
    this.openAILLM = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.anthropicLLM = new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
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

  async generateDraft(sourceLanguage: string, topic: string, modelProvider: ModelProvider) {
    const llm = this.getModel(modelProvider);

    const promptTemplate = PromptTemplate.fromTemplate(
      'Generate a short, engaging marketing headline and description about {topic} in {sourceLanguage}.',
    );

    // Use LCEL: Pipe the prompt into the LLM and then into an output parser
    const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

    return chain.invoke({ topic, sourceLanguage });
  }

  async translateContent(text: string, targetLanguage: string, modelProvider: ModelProvider) {
    const llm = this.getModel(modelProvider);

    const translatePrompt = PromptTemplate.fromTemplate('Translate the following text into {targetLanguage}: {text}');

    // Use LCEL again
    const translateChain = translatePrompt.pipe(llm).pipe(new StringOutputParser());

    return translateChain.invoke({ text, targetLanguage });
  }
}
