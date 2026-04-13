import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { translationPrompt } from '../prompts/translation.prompt';

export interface TranslationInput {
  campaignName: string;
  campaignDescription: string;
  contentType: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
}

/**
 * Builds a LangChain runnable that translates marketing content.
 * @param model - The LLM to use
 * @returns A runnable that takes TranslationInput and returns the translated text
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTranslationChain(model: any) {
  return RunnableSequence.from([
    {
      campaignName: (input: TranslationInput) => input.campaignName,
      campaignDescription: (input: TranslationInput) => input.campaignDescription || 'N/A',
      contentType: (input: TranslationInput) => input.contentType,
      sourceLanguage: (input: TranslationInput) => input.sourceLanguage,
      targetLanguage: (input: TranslationInput) => input.targetLanguage,
      sourceText: (input: TranslationInput) => input.sourceText,
    },
    translationPrompt,
    model,
    new StringOutputParser(),
  ]);
}
