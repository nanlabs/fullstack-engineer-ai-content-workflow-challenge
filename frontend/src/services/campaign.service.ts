import type {
  CampaignApiError,
  CreateCampaignPayload,
  CreateCampaignResponse,
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
