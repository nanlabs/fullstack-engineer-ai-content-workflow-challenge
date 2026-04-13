import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';

@Injectable()
export class AnthropicProvider {
  private model: ChatAnthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * @returns LangChain ChatAnthropic instance, or null if API key is not configured
   */
  getModel(): ChatAnthropic | null {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey || apiKey.startsWith('sk-ant-your')) return null;

    if (!this.model) {
      this.model = new ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName: 'claude-sonnet-4-20250514',
        temperature: 0.7,
        maxTokens: 2048,
      });
    }

    return this.model;
  }

  getModelName(): string {
    return 'claude-sonnet-4-20250514';
  }

  getProviderName(): 'anthropic' {
    return 'anthropic';
  }

  isAvailable(): boolean {
    return this.getModel() !== null;
  }
}
