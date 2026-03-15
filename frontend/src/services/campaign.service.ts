import type {
  CampaignDetails,
  CampaignApiError,
  ContentLocalization,
  CreateCampaignPayload,
  CreateCampaignResponse,
  UpdateLocalizationContentPayload,
  UpdateLocalizationStatusPayload,
} from '../types/campaign'

export async function createCampaign(
  payload: CreateCampaignPayload,
): Promise<CreateCampaignResponse> {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await parseResponseBody(response)) as Partial<CreateCampaignResponse> &
    CampaignApiError

  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message
    throw new Error(message || `Failed to create campaign (${response.status})`)
  }

  if (!data.id) {
    throw new Error('Campaign was created but response did not include an id.')
  }

  return { id: data.id }
}

export async function getCampaignById(id: string): Promise<CampaignDetails> {
  const response = await fetch(`/api/campaigns/${id}`)
  const data = (await parseResponseBody(response)) as Partial<CampaignDetails> & CampaignApiError

  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message
    throw new Error(message || `Failed to load campaign (${response.status})`)
  }

  if (!data.id) {
    throw new Error('Campaign details response is missing required fields.')
  }

  return data as CampaignDetails
}

export async function updateLocalizationContent(
  localizationId: string,
  payload: UpdateLocalizationContentPayload,
): Promise<ContentLocalization> {
  const response = await fetch(`/api/content-localizations/${localizationId}/content`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await parseResponseBody(response)) as Partial<ContentLocalization> & CampaignApiError

  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message
    throw new Error(message || `Failed to update content (${response.status})`)
  }

  if (!data.id) {
    throw new Error('Updated localization response is missing required fields.')
  }

  return data as ContentLocalization
}

export async function updateLocalizationStatus(
  localizationId: string,
  payload: UpdateLocalizationStatusPayload,
): Promise<ContentLocalization> {
  const response = await fetch(`/api/content-localizations/${localizationId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await parseResponseBody(response)) as Partial<ContentLocalization> & CampaignApiError

  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message
    throw new Error(message || `Failed to update status (${response.status})`)
  }

  if (!data.id) {
    throw new Error('Updated status response is missing required fields.')
  }

  return data as ContentLocalization
}

async function parseResponseBody(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text()
  if (!raw.trim()) {
    return {}
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new Error(`Backend returned invalid JSON (${response.status}).`)
  }
}
