import { ChatPromptTemplate } from '@langchain/core/prompts';

export const generateDraftPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a senior marketing copywriter at a global media agency.
Generate high-quality content for international marketing campaigns.
Be creative, concise, and match the requested content type.
Respond ONLY with the generated content — no explanations or preamble.`,
  ],
  [
    'human',
    `Campaign: {campaignName}
Campaign description: {campaignDescription}
Content type: {contentType}
Title/Topic: {title}
Language: {language}

Generate the content body for this piece.`,
  ],
]);

export const translatePrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert translator and localization specialist.
Translate the content naturally — adapt idioms, cultural references, and tone for the target audience.
Do NOT translate literally. Localize for the target market.
Respond ONLY with the translated content — no explanations.`,
  ],
  [
    'human',
    `Original content ({sourceLanguage}):
Title: {title}
Body: {body}

Translate and localize to: {targetLanguage}

Respond in this exact format:
TITLE: <translated title>
BODY: <translated body>`,
  ],
]);

export const extractMetadataPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a content analyst. Extract structured metadata from marketing content.
Respond ONLY with valid JSON — no markdown, no code fences, no explanations.`,
  ],
  [
    'human',
    `Analyze this content and extract metadata:

Title: {title}
Body: {body}
Language: {language}

Return JSON with this exact structure:
{{
  "keywords": ["keyword1", "keyword2", ...],
  "tone": "professional|casual|urgent|inspirational|humorous",
  "sentiment": "positive|neutral|negative",
  "readability": "simple|moderate|complex"
}}`,
  ],
]);
