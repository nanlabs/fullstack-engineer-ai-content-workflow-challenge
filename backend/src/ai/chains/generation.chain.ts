import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { generationPrompt } from '../prompts/generation.prompt';

export interface GenerationInput {
  campaignName: string;
  campaignDescription: string;
  contentType: string;
  language: string;
  existingText?: string;
  tone?: string;
  style?: string;
}

/**
 * Builds a LangChain runnable that generates marketing content.
 * @param model - The LLM to use (OpenAI or Anthropic via LangChain)
 * @returns A runnable that takes GenerationInput and returns the generated text
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildGenerationChain(model: any) {
  return RunnableSequence.from([
    {
      campaignName: (input: GenerationInput) => input.campaignName,
      campaignDescription: (input: GenerationInput) => input.campaignDescription || 'N/A',
      contentType: (input: GenerationInput) => input.contentType,
      language: (input: GenerationInput) => input.language,
      toneInstruction: (input: GenerationInput) =>
        input.tone ? `Tone: ${input.tone}` : '',
      styleInstruction: (input: GenerationInput) =>
        input.style ? `Style: ${input.style}` : '',
      existingTextInstruction: (input: GenerationInput) =>
        input.existingText
          ? `Use the following as inspiration or starting point:\n"${input.existingText}"`
          : 'Generate original content from scratch based on the campaign brief.',
    },
    generationPrompt,
    model,
    new StringOutputParser(),
  ]);
}
