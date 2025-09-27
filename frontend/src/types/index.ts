// Database types matching backend Prisma schema
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  contentPieces?: ContentPiece[];
}

export interface ContentPiece {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  campaignId: string;
  campaign?: Campaign;
  drafts?: Draft[];
}

export interface Draft {
  id: string;
  content: string;
  language: string;
  translations?: Record<string, string>; // { "es": "...", "fr": "..." }
  translationStates?: Record<string, string>; // { "es": "APPROVED", "fr": "REJECTED" }
  reviewState: ReviewState;
  aiModel?: string;
  createdAt: string;
  updatedAt: string;
  contentPieceId: string;
  contentPiece?: ContentPiece;
}

export enum ReviewState {
  DRAFT = 'DRAFT',
  SUGGESTED_BY_AI = 'SUGGESTED_BY_AI',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// API request/response types
export interface CreateCampaignRequest {
  name: string;
  description?: string;
}

export interface CreateContentPieceRequest {
  title: string;
  description?: string;
  contentType: string;
  campaignId: string;
  language?: string;
}

export interface GenerateDraftRequest {
  contentPieceId: string;
  prompt: string;
}

// Translation types
export interface TranslationRequest {
  draftId: string;
  targetLanguages: string[];
}

export interface TranslationResult {
  language: string;
  content: string;
  success: boolean;
  error?: string;
}

export interface SupportedLanguages {
  [key: string]: string; // { "es": "Spanish", "en": "English" }
}

export interface SupportedLanguagesResponse {
  success: boolean;
  data: SupportedLanguages;
  message: string;
}

// WebSocket event types
export interface WebSocketCampaignEvent {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebSocketContentPieceEvent {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  campaignId: string;
}

export interface WebSocketDraftEvent {
  id: string;
  content: string;
  language: string;
  translations?: Record<string, string>;
  translationStates?: Record<string, string>;
  reviewState: ReviewState;
  aiModel?: string;
  createdAt: string;
  updatedAt: string;
  contentPieceId: string;
}

export interface WebSocketEventData {
  campaignId?: string;
  contentPieceId?: string;
  draftId?: string;
  prompt?: string;
  error?: string;
  draft?: WebSocketDraftEvent;
}
