import { ChatPromptTemplate } from '@langchain/core/prompts';

export const EXTRACTION_SYSTEM = `You are a content analysis expert. You extract structured metadata from marketing content.
Always respond with valid JSON and nothing else. No markdown code fences, no commentary.`;

export const EXTRACTION_HUMAN = `Analyze the following marketing content and extract metadata.

Content type: {contentType}
Language: {language}
Text:
{text}

Respond with a JSON object containing:
- "keywords": array of 3-8 relevant keywords/phrases
- "tone": one of "formal", "casual", "urgent", "playful", "inspirational", "professional"
- "sentiment": a number from -1 (very negative) to 1 (very positive)
- "summary": a one-sentence summary of the content (max 150 characters)

Output ONLY valid JSON.`;

export const extractionPrompt = ChatPromptTemplate.fromMessages([
  ['system', EXTRACTION_SYSTEM],
  ['human', EXTRACTION_HUMAN],
]);
