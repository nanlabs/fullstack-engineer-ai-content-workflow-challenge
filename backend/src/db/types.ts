import { 
  CampaignStatus, 
  ContentStatus, 
  ContentType, 
  ReviewStatus, 
  TranslationStatus,
  User as PrismaUser,
  Campaign as PrismaCampaign,
  ContentPiece as PrismaContentPiece,
  Review as PrismaReview,
  Translation as PrismaTranslation
} from '@prisma/client';

export { 
  CampaignStatus, 
  ContentStatus, 
  ContentType, 
  ReviewStatus, 
  TranslationStatus 
};

export interface User extends Omit<PrismaUser, 'password'> {
  // User without sensitive password field for API responses
}

export interface Campaign extends PrismaCampaign {
  createdBy?: User;
  contentPieces?: ContentPiece[];
}

export interface ContentPiece extends PrismaContentPiece {
  campaign?: Campaign;
  createdBy?: User;
  translations?: Translation[];
  reviews?: Review[];
}

export interface Review extends PrismaReview {
  contentPiece?: ContentPiece;
  reviewer?: User;
}

export interface Translation extends PrismaTranslation {
  contentPiece?: ContentPiece;
}

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

export interface CreateContentForCampaignInput {
  title: string;
  type: ContentType;
  content?: string;
  status?: ContentStatus;
  language?: string;
  aiGenerated?: boolean;
  promptUsed?: string;
  aiModelUsed?: string;
  tokensUsed?: number;
}

export interface UpdateContentInput {
  title?: string;
  content?: string;
  status?: ContentStatus;
  language?: string;
  aiGenerated?: boolean;
  promptUsed?: string;
  aiModelUsed?: string;
  tokensUsed?: number;
}

export interface CreateReviewInput {
  status: ReviewStatus;
  comments?: string;
}

export interface UpdateReviewInput {
  status?: ReviewStatus;
  comments?: string;
}

export interface CreateTranslationInput {
  language: string;
  content: string;
  status?: TranslationStatus;
  aiModelUsed?: string;
  tokensUsed?: number;
}

export interface CampaignWithStats extends Campaign {
  _count?: {
    contentPieces: number;
  };
  contentPiecesStats?: {
    [ContentStatus.DRAFT]: number;
    [ContentStatus.AI_GENERATED]: number;
    [ContentStatus.REVIEW]: number;
    [ContentStatus.APPROVED]: number;
    [ContentStatus.REJECTED]: number;
  };
}

export interface ContentWithRelations extends ContentPiece {
  campaign: Campaign;
  createdBy: User;
  reviews?: Review[];
  translations?: Translation[];
}
export interface CampaignFilters {
  status?: CampaignStatus;
}

export interface ContentFilters {
  campaignId?: string;
  status?: ContentStatus;
  type?: ContentType;
  language?: string;
  aiGenerated?: boolean;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  contentPieceId?: string;
}

export interface TranslationFilters {
  language?: string;
  status?: TranslationStatus;
}

export interface AIGenerationRequest {
  type: ContentType;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerationResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

export interface TranslationRequest {
  content: string;
  targetLanguages: string[];
  model?: string;
}

export interface TranslationResponse {
  translations: Array<{
    language: string;
    content: string;
    model: string;
    tokensUsed: number;
  }>;
}
