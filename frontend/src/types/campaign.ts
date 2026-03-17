export type CampaignProvider = 'openai' | 'anthropic';
export type ReviewStatus = 'DRAFT' | 'AI_SUGGESTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';

export type ProviderModelOption = {
  id: string;
  label: string;
};

export type CreateCampaignPayload = {
  topic: string;
  description?: string;
  provider: CampaignProvider;
  model: string;
  languages: string[];
};

export type CampaignApiError = {
  message?: string | string[];
};

export type CreateCampaignResponse = {
  id: string;
};

export type ContentLocalization = {
  id: string;
  languageCode: string;
  titleSuggestion: string | null;
  bodySuggestion: string | null;
  status: ReviewStatus;
  updatedAt: string;
};

export type ContentPiece = {
  id: string;
  name: string;
  type: string;
  localizations: ContentLocalization[];
};

export type CampaignDetails = {
  id: string;
  topic: string;
  description: string | null;
  languages: string[];
  llmProvider: string;
  model: string;
  createdAt: string;
  pieces: ContentPiece[];
};

export type CampaignSummaryLocalization = {
  id: string;
  languageCode: string;
  status: ReviewStatus;
  updatedAt: string;
};

export type CampaignSummaryPiece = {
  id: string;
  name: string;
  type: string;
  localizations: CampaignSummaryLocalization[];
};

export type CampaignSummary = {
  id: string;
  topic: string;
  description: string | null;
  languages: string[];
  llmProvider: string;
  model: string;
  createdAt: string;
  pieces: CampaignSummaryPiece[];
};

export type UpdateLocalizationContentPayload = {
  titleSuggestion?: string;
  bodySuggestion?: string;
};

export type UpdateLocalizationStatusPayload = {
  status: ReviewStatus;
};
