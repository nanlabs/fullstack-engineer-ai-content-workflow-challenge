// Generated types from Prisma schema
// This file will be auto-generated when Prisma client is generated

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

export enum ContentStatus {
  DRAFT = 'DRAFT',
  AI_GENERATED = 'AI_GENERATED',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum ContentType {
  SOCIAL_POST = 'SOCIAL_POST',
  EMAIL_SUBJECT = 'EMAIL_SUBJECT',
  EMAIL_BODY = 'EMAIL_BODY',
  PRODUCT_DESCRIPTION = 'PRODUCT_DESCRIPTION',
  BLOG_POST = 'BLOG_POST',
  AD_COPY = 'AD_COPY',
  AD_HEADLINE = 'AD_HEADLINE'
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED'
}

export enum UserRole {
  CREATOR = 'CREATOR',
  REVIEWER = 'REVIEWER',
  ADMIN = 'ADMIN'
}

export enum TranslationStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVIEWED = 'REVIEWED'
}

// Base entity interfaces
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
}

export interface Campaign extends BaseEntity {
  name: string;
  description?: string;
  status: CampaignStatus;
  createdById: string;
  createdBy?: User;
  contentPieces?: ContentPiece[];
}

export interface ContentPiece extends BaseEntity {
  campaignId: string;
  title: string;
  type: ContentType;
  content?: string;
  status: ContentStatus;
  language: string;
  aiGenerated: boolean;
  promptUsed?: string;
  aiModelUsed?: string;
  tokensUsed?: number;
  campaign?: Campaign;
  translations?: Translation[];
  reviews?: Review[];
}

export interface Translation extends BaseEntity {
  contentPieceId: string;
  language: string;
  content: string;
  status: TranslationStatus;
  aiModelUsed?: string;
  tokensUsed?: number;
  contentPiece?: ContentPiece;
}

export interface Review extends BaseEntity {
  contentPieceId: string;
  reviewerId: string;
  status: ReviewStatus;
  comments?: string;
  reviewedAt?: Date;
  contentPiece?: ContentPiece;
  reviewer?: User;
}

// Utility types for API operations
export interface CreateCampaignInput {
  name: string;
  description?: string;
  status?: CampaignStatus;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  status?: CampaignStatus;
}

export interface CreateContentPieceInput {
  campaignId: string;
  title: string;
  type: ContentType;
  content?: string;
  language?: string;
}

export interface UpdateContentPieceInput {
  title?: string;
  content?: string;
  status?: ContentStatus;
}

export interface CreateReviewInput {
  contentPieceId: string;
  comments?: string;
}

export interface UpdateReviewInput {
  status: ReviewStatus;
  comments?: string;
}

export interface CreateTranslationInput {
  contentPieceId: string;
  language: string;
  content: string;
  aiModelUsed?: string;
}

// API Response types
export interface CampaignWithStats extends Campaign {
  _count: {
    contentPieces: number;
  };
  contentPiecesStats: {
    draft: number;
    aiGenerated: number;
    review: number;
    approved: number;
    rejected: number;
  };
}

export interface ContentPieceWithRelations extends ContentPiece {
  campaign: Campaign;
  reviews: Review[];
  translations: Translation[];
}

// AI Service types
export interface AIGenerationRequest {
  type: ContentType;
  prompt: string;
  model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-instant';
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerationResponse {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason?: string;
}

export interface TranslationRequest {
  content: string;
  targetLanguage: string;
  sourceLanguage?: string;
  model?: string;
}

export interface TranslationResponse {
  translatedContent: string;
  model: string;
  tokensUsed: number;
  confidence?: number;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter types
export interface CampaignFilters {
  status?: CampaignStatus;
  createdById?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ContentPieceFilters {
  campaignId?: string;
  status?: ContentStatus;
  type?: ContentType;
  language?: string;
  aiGenerated?: boolean;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  reviewerId?: string;
  contentPieceId?: string;
}
