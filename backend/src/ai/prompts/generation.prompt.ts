import { ChatPromptTemplate } from '@langchain/core/prompts';

export const GENERATION_SYSTEM = `You are a senior marketing copywriter at a global media agency.
You write compelling, brand-aligned content for international campaigns.
Your output must be polished, ready for review, and appropriate for the specified content type.
Do not include any meta-commentary — output ONLY the final content.`;

export const GENERATION_HUMAN = `Write {contentType} content for the following campaign:

Campaign: {campaignName}
Brief: {campaignDescription}
Language: {language}
{toneInstruction}
{styleInstruction}

{existingTextInstruction}

Produce exactly one {contentType}. Output ONLY the content text, nothing else.`;

export const generationPrompt = ChatPromptTemplate.fromMessages([
  ['system', GENERATION_SYSTEM],
  ['human', GENERATION_HUMAN],
]);
