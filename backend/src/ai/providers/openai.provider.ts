import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class OpenAiProvider {
  private model: ChatOpenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * @returns LangChain ChatOpenAI instance, or null if API key is not configured
   */
  getModel(): ChatOpenAI | null {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey || apiKey.startsWith('sk-your')) return null;

    if (!this.model) {
      this.model = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2048,
      });
    }

    return this.model;
  }

  getModelName(): string {
    return 'gpt-4o';
  }

  getProviderName(): 'openai' {
    return 'openai';
  }

  isAvailable(): boolean {
    return this.getModel() !== null;
  }
}
