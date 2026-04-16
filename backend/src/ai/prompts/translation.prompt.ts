import { ChatPromptTemplate } from '@langchain/core/prompts';

export const TRANSLATION_SYSTEM = `You are an expert marketing translator and localization specialist.
You translate marketing content while preserving brand voice, emotional impact, and cultural nuance.
Adapt idioms and cultural references for the target market rather than translating literally.
Do not include any meta-commentary — output ONLY the translated text.`;

export const TRANSLATION_HUMAN = `Translate the following {contentType} from {sourceLanguage} to {targetLanguage}.

Campaign context: {campaignName} — {campaignDescription}

Original text:
{sourceText}

Produce ONLY the translated text, preserving the tone and marketing effectiveness. Do not add explanations.`;

export const translationPrompt = ChatPromptTemplate.fromMessages([
  ['system', TRANSLATION_SYSTEM],
  ['human', TRANSLATION_HUMAN],
]);
