import { RunnableSequence } from '@langchain/core/runnables';
import { extractionPrompt } from '../prompts/extraction.prompt';

export interface ExtractionInput {
  contentType: string;
  language: string;
  text: string;
}

export interface ExtractionOutput {
  keywords: string[];
  tone: string;
  sentiment: number;
  summary: string;
}

/**
 * Builds a LangChain runnable that extracts structured metadata from content.
 * @param model - The LLM to use
 * @returns A runnable that takes ExtractionInput and returns parsed ExtractionOutput
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildExtractionChain(model: any) {
  return RunnableSequence.from([
    {
      contentType: (input: ExtractionInput) => input.contentType,
      language: (input: ExtractionInput) => input.language,
      text: (input: ExtractionInput) => input.text,
    },
    extractionPrompt,
    model,
    (output): ExtractionOutput => {
      const text = typeof output === 'string' ? output : output.content?.toString() ?? '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        return {
          keywords: [],
          tone: 'professional',
          sentiment: 0,
          summary: 'Could not parse extraction result.',
        };
      }
    },
  ]);
}
