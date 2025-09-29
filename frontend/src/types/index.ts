// Enums del backend
export enum CampaignStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE", 
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED"
}

export enum ContentStatus {
  DRAFT = "DRAFT",           
  AI_GENERATED = "AI_GENERATED", 
  APPROVED = "APPROVED",     
  REJECTED = "REJECTED"      
}

export enum ContentType {
  SOCIAL_POST = "SOCIAL_POST",
  EMAIL_SUBJECT = "EMAIL_SUBJECT", 
  EMAIL_BODY = "EMAIL_BODY",
  PRODUCT_DESCRIPTION = "PRODUCT_DESCRIPTION",
  BLOG_POST = "BLOG_POST",
  AD_COPY = "AD_COPY",
  AD_HEADLINE = "AD_HEADLINE"
}

export enum TranslationStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED", 
  REVIEWED = "REVIEWED"
}

// DTOs de respuesta del backend
export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignResponseDto {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserResponseDto;
  contentPieces?: ContentResponseDto[];
}

export interface ContentResponseDto {
  id: string;
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
  createdAt: string;
  updatedAt: string;
  campaign?: CampaignResponseDto;
  translations?: TranslationResponseDto[];
}

export interface TranslationResponseDto {
  id: string;
  contentPieceId: string;
  language: string;
  content: string;
  status: TranslationStatus;
  aiModelUsed?: string;
  tokensUsed?: number;
  createdAt: string;
  updatedAt: string;
  contentPiece?: ContentResponseDto;
}

// DTOs de request para el backend
export interface CreateCampaignDto {
  name: string;
  description?: string;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  status?: CampaignStatus;
}

export interface CreateContentDto {
  title: string;
  type: ContentType;
  content?: string;
  language?: string;
}

export interface UpdateContentDto {
  title?: string;
  content?: string;
  status?: ContentStatus;
}

export interface GenerateAIContentDto {
  prompt: string;
  model?: string;
}

export interface RegenerateAIContentDto {
  feedback: string;
  model?: string;
}

export interface CreateTranslationDto {
  contentPieceId: string;
  language: string;
  content: string;
}

export interface GenerateAITranslationDto {
  language: string;
  context?: string;
  aiModelUsed?: string;
}

export interface UpdateTranslationDto {
  content?: string;
  status?: TranslationStatus;
}

export interface RegenerateTranslationDto {
  feedback: string;
  model?: string;
}

// Auth DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponseDto {
  user: UserResponseDto;
  access_token: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// WebSocket event types
export interface WebSocketEventData {
  campaign: CampaignResponseDto;
  content: ContentResponseDto;
  translation: TranslationResponseDto;
  id: string;
  status: ContentStatus | TranslationStatus | CampaignStatus;
}
