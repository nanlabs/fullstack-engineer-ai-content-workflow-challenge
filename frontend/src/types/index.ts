export type ContentType = 'HEADLINE' | 'DESCRIPTION' | 'CTA' | 'TAGLINE' | 'BODY_COPY';
export type ContentStatus = 'DRAFT' | 'AI_SUGGESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type AIModel = 'CLAUDE_3_5_SONNET' | 'GPT_4O';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  targetLangs: string[];
  createdAt: string;
  updatedAt: string;
  contents?: ContentPiece[];
  _count?: { contents: number };
}

export interface ContentPiece {
  id: string;
  campaignId: string;
  type: ContentType;
  originalText: string;
  status: ContentStatus;
  reviewNotes?: string;
  aiDrafts?: AIDraft[];
  translations?: Translation[];
  createdAt: string;
  updatedAt: string;
}

export interface AIDraft {
  id: string;
  contentPieceId: string;
  model: AIModel;
  prompt: string;
  generatedText: string;
  keywords: string[];
  tone?: string;
  sentiment?: string;
  isSelected: boolean;
  createdAt: string;
}

export interface Translation {
  id: string;
  contentPieceId: string;
  targetLanguage: string;
  translatedText: string;
  model: AIModel;
  status: ContentStatus;
  createdAt: string;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  targetLangs: string[];
}

export interface CreateContentData {
  type: ContentType;
  originalText: string;
}

export interface ReviewContentData {
  status: ContentStatus;
  reviewNotes?: string;
}

export interface GenerateDraftData {
  model?: AIModel;
  prompt?: string;
}

export interface TranslateContentData {
  targetLanguage: string;
  model?: AIModel;
}

export interface CompareModelsData {
  prompt?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
