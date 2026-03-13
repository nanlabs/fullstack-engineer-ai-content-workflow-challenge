import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';

export function createModel(provider: string, model: string) {
  const normalizedProvider = provider.toLowerCase();

  if (normalizedProvider === 'openai') {
    return new ChatOpenAI({ model });
  }

  if (normalizedProvider === 'anthropic') {
    return new ChatAnthropic({ model });
  }

  throw new Error('Unsupported provider');
}
