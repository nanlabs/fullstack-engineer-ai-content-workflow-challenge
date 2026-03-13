export function buildPiecesPrompt(topic: string) {
  return `
You are a marketing strategist.

Given this campaign topic propose marketing content pieces.

Topic: ${topic}

Return JSON:

{
 "pieces":[
   {"type":"blog_post"},
   {"type":"instagram_post"},
   {"type":"email_newsletter"}
 ]
}
`;
}
