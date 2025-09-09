import { registerEnumType } from '@nestjs/graphql';

export enum ModelProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
}

registerEnumType(ModelProvider, {
  name: 'ModelProvider',
  description: 'The model provider for AI content generation.',
});
