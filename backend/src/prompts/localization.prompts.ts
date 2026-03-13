export function buildContentPrompt(topic: string, type: string, language: string) {
  return `
You are a marketing copywriter.

Generate marketing content.

Topic: ${topic}
Content type: ${type}
Language: ${language}

Return JSON:

{
 "title": "...",
 "body": "..."
}
`;
}
