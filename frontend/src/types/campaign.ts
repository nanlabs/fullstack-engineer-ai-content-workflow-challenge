export type CampaignProvider = 'openai' | 'anthropic'

export type CreateCampaignPayload = {
  topic: string
  description?: string
  provider: CampaignProvider
  model: string
  languages: string[]
}

export type CampaignApiError = {
  message?: string | string[]
}

export type CreateCampaignResponse = {
  id: string
}
