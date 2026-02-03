export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED'

export type ReviewState =
  | 'DRAFT'
  | 'AI_SUGGESTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'

export type ReviewDecision = 'APPROVE' | 'REJECT' | 'EDIT'

export type ContentMetadata = {
  reviewFeedback?: string
  reviewedAt?: string
  [key: string]: unknown
}

export type ContentPiece = {
  id: string
  campaignId: string
  type: string
  title: string
  originalText: string
  aiDraft?: string | null
  translations?: Record<string, string> | null
  reviewState: ReviewState
  metadata?: ContentMetadata | null
  createdAt: string
  updatedAt: string
  campaign?: Campaign
}

export type Campaign = {
  id: string
  name: string
  description?: string | null
  status: CampaignStatus
  targetLanguages: string[]
  contentPieces?: ContentPiece[]
  createdAt: string
  updatedAt: string
}

export type CreateCampaignPayload = {
  name: string
  description?: string
  status?: CampaignStatus
  targetLanguages?: string[]
}

export type UpdateCampaignPayload = Partial<CreateCampaignPayload>

export type CreateContentPayload = {
  title: string
  type: string
  originalText: string
}

export type UpdateContentPayload = Partial<CreateContentPayload>

export type GenerateDraftPayload = {
  tone?: string
  instructions?: string
}

export type TranslatePayload = {
  targetLanguages: string[]
  instructions?: string
}

export type SubmitReviewPayload = {
  decision: ReviewDecision
  editedText?: string
  feedback?: string
}
