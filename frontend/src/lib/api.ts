import type {
  Campaign,
  ContentPiece,
  CreateCampaignPayload,
  CreateContentPayload,
  GenerateDraftPayload,
  SubmitReviewPayload,
  TranslatePayload,
  UpdateCampaignPayload,
  UpdateContentPayload,
} from './types'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.message ?? 'Unexpected error communicating with API'
    throw new Error(message)
  }

  return payload as T
}

export const api = {
  getCampaigns: () => request<Campaign[]>('/campaigns'),
  getCampaign: (id: string) => request<Campaign>(`/campaigns/${id}`),
  createCampaign: (payload: CreateCampaignPayload) =>
    request<Campaign>('/campaigns', { method: 'POST', body: payload }),
  updateCampaign: (id: string, payload: UpdateCampaignPayload) =>
    request<Campaign>(`/campaigns/${id}`, { method: 'PATCH', body: payload }),
  deleteCampaign: (id: string) => request<void>(`/campaigns/${id}`, { method: 'DELETE' }),
  createContent: (campaignId: string, payload: CreateContentPayload) =>
    request<ContentPiece>(`/campaigns/${campaignId}/content`, {
      method: 'POST',
      body: payload,
    }),
  getContent: (id: string) => request<ContentPiece>(`/content/${id}`),
  updateContent: (id: string, payload: UpdateContentPayload) =>
    request<ContentPiece>(`/content/${id}`, { method: 'PATCH', body: payload }),
  deleteContent: (id: string) => request<void>(`/content/${id}`, { method: 'DELETE' }),
  generateDraft: (id: string, payload: GenerateDraftPayload) =>
    request<ContentPiece>(`/content/${id}/generate`, { method: 'POST', body: payload }),
  translateContent: (id: string, payload: TranslatePayload) =>
    request<ContentPiece>(`/content/${id}/translate`, { method: 'POST', body: payload }),
  submitReview: (id: string, payload: SubmitReviewPayload) =>
    request<ContentPiece>(`/content/${id}/review`, { method: 'POST', body: payload }),
}
