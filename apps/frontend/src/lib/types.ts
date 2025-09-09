export type Campaign = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;

  contentPieces: ContentPiece[];
};

export const ReviewState = {
  draft: 'Draft',
  suggested_by_ai: 'SuggestedByAI',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
export type ReviewStateType = (typeof ReviewState)[keyof typeof ReviewState];

export type ContentPiece = {
  id: string;
  reviewState: ReviewStateType;
  aiGeneratedDraft?: object;
  sourceLanguage: string;

  createdAt: string;
  updatedAt: string;

  translations: ContentPieceTranslation[];
};

export type ContentPieceTranslation = {
  id: string;
  languageCode: string;
  translatedTitle: string;
  translatedDescription: string;
  isAIGenerated: boolean;
  isHumanEdited: boolean;
  modelProvider?: string;

  createdAt: string;
  updatedAt: string;
};
