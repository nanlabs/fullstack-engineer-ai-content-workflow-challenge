export type Campaign = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;

  contentPieces: Content[];
};

export const ReviewState = {
  draft: 'draft',
  suggested_by_ai: 'suggested_by_ai',
  reviewed: 'reviewed',
  approved: 'approved',
  rejected: 'rejected',
} as const;
export type ReviewStateType = (typeof ReviewState)[keyof typeof ReviewState];

export type Content = {
  id: string;
  reviewState: ReviewStateType;
  aiGeneratedDraft?: object;
  sourceLanguage: string;

  createdAt: string;
  updatedAt: string;

  translations: ContentTranslation[];
};

export type ContentTranslation = {
  id: string;
  languageCode: string;
  translatedTitle: string;
  translatedDescription: string;
  isAIGenerated: boolean;
  isHumanEdited: boolean;

  createdAt: string;
  updatedAt: string;
};
