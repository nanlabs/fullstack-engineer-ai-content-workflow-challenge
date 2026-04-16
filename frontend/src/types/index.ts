export type CampaignStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ContentType = 'headline' | 'description' | 'body' | 'cta' | 'tagline';
export type AiProvider = 'openai' | 'anthropic';
export type TaskType = 'generation' | 'translation' | 'extraction' | 'summarization';
export type ReviewState = 'draft' | 'ai_suggested' | 'reviewed' | 'approved' | 'rejected';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  targetLanguages: string[];
  sourceLanguage: string;
  createdAt: string;
  updatedAt: string;
  contentPieces?: ContentPiece[];
  _count?: { contentPieces: number };
}

export interface ContentPiece {
  id: string;
  campaignId: string;
  type: ContentType;
  originalText: string | null;
  language: string;
  metadata: ExtractionMetadata | null;
  createdAt: string;
  updatedAt: string;
  campaign?: Pick<Campaign, 'id' | 'name' | 'targetLanguages' | 'sourceLanguage'>;
  aiDrafts?: AiDraft[];
  _count?: { aiDrafts: number };
}

export interface AiDraft {
  id: string;
  contentPieceId: string;
  provider: AiProvider;
  model: string;
  taskType: TaskType;
  targetLanguage: string | null;
  generatedText: string;
  metadata: ExtractionMetadata | null;
  reviewState: ReviewState;
  reviewerNotes: string | null;
  editedText: string | null;
  createdAt: string;
  updatedAt: string;
  contentPiece?: ContentPiece;
}

export interface ExtractionMetadata {
  keywords: string[];
  tone: string;
  sentiment: number;
  summary: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
