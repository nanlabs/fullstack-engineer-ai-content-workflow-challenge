import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderModel } from './ai.types';

@Injectable()
export class AiModelCatalogService {
  constructor(private readonly configService: ConfigService) {}

  async getModelsByProvider(provider: string): Promise<ProviderModel[]> {
    const normalizedProvider = provider.toLowerCase();

    if (normalizedProvider === 'openai') {
      return this.fetchOpenAiModels();
    }

    if (normalizedProvider === 'anthropic') {
      return this.fetchAnthropicModels();
    }

    throw new BadRequestException(`Unsupported provider "${provider}"`);
  }

  private async fetchOpenAiModels(): Promise<ProviderModel[]> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is missing on server');
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new ServiceUnavailableException(
        `Could not fetch OpenAI models (${response.status}): ${raw}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: string }>;
    };

    return (payload.data ?? [])
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id))
      .filter((id) => this.isChatCompatibleOpenAiModel(id))
      .sort((a, b) => a.localeCompare(b))
      .map((id) => ({ id, label: id }));
  }

  private async fetchAnthropicModels(): Promise<ProviderModel[]> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('ANTHROPIC_API_KEY is missing on server');
    }

    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new ServiceUnavailableException(
        `Could not fetch Anthropic models (${response.status}): ${raw}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: string; display_name?: string }>;
    };

    return (payload.data ?? [])
      .map((item) => ({
        id: item.id ?? '',
        label: item.display_name ?? item.id ?? '',
      }))
      .filter((item) => item.id.length > 0)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private isChatCompatibleOpenAiModel(modelId: string): boolean {
    const normalized = modelId.toLowerCase();

    // The app invokes chat completions through ChatOpenAI.
    // Keep only known chat-capable families and exclude non-chat endpoints.
    if (
      normalized.startsWith('gpt-') ||
      normalized.startsWith('chatgpt-') ||
      normalized.startsWith('o1') ||
      normalized.startsWith('o3') ||
      normalized.startsWith('o4')
    ) {
      return true;
    }

    return false;
  }
}
