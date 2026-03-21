export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  targetLanguages: string[];
  createdAt: string;
  updatedAt: string;
  contentPieces?: ContentPiece[];
}

export type ContentType = 'HEADLINE' | 'PRODUCT_DESCRIPTION' | 'AD_COPY' | 'BLOG_POST';
export type ContentStatus = 'DRAFT' | 'AI_SUGGESTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';

export interface ContentPiece {
  id: string;
  campaignId: string;
  type: ContentType;
  title: string;
  body: string;
  language: string;
  status: ContentStatus;
  aiModel: string | null;
  parentId: string | null;
  metadata: ContentMetadata | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  translations?: ContentPiece[];
  campaign?: Campaign;
}

export interface ContentMetadata {
  keywords: string[];
  tone: string;
  sentiment: string;
  readability: string;
}

export interface ProvidersResponse {
  all: string[];
  available: string[];
  default: string;
}

export interface CompareResponse {
  contentId: string;
  comparisons: Record<string, string>;
}

export interface ChainResponse {
  piece: ContentPiece;
  translations: ContentPiece[];
}
