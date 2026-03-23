import type {
  Campaign,
  ContentPiece,
  AIDraft,
  Translation,
  CreateCampaignData,
  CreateContentData,
  ReviewContentData,
  GenerateDraftData,
  TranslateContentData,
  CompareModelsData,
  RunChainData,
  ChainResult,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = Array.isArray(body.message) ? body.message[0] : body.message;
      else if (body?.error) message = body.error;
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// Campaigns
export function getCampaigns(): Promise<Campaign[]> {
  return request<Campaign[]>('/campaigns');
}

export function createCampaign(data: CreateCampaignData): Promise<Campaign> {
  return request<Campaign>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getCampaign(id: string): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}`);
}

export function updateCampaign(
  id: string,
  data: Partial<CreateCampaignData>,
): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteCampaign(id: string): Promise<void> {
  return request<void>(`/campaigns/${id}`, { method: 'DELETE' });
}

// Content
export function getContent(campaignId: string): Promise<ContentPiece[]> {
  return request<ContentPiece[]>(`/campaigns/${campaignId}/content`);
}

export function createContent(
  campaignId: string,
  data: CreateContentData,
): Promise<ContentPiece> {
  return request<ContentPiece>(`/campaigns/${campaignId}/content`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getContentPiece(
  campaignId: string,
  contentId: string,
): Promise<ContentPiece> {
  return request<ContentPiece>(`/campaigns/${campaignId}/content/${contentId}`);
}

export function updateContent(
  campaignId: string,
  contentId: string,
  data: Partial<CreateContentData>,
): Promise<ContentPiece> {
  return request<ContentPiece>(`/campaigns/${campaignId}/content/${contentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function reviewContent(
  campaignId: string,
  contentId: string,
  data: ReviewContentData,
): Promise<ContentPiece> {
  return request<ContentPiece>(
    `/campaigns/${campaignId}/content/${contentId}/review`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

// AI Drafts
export function selectDraft(
  campaignId: string,
  contentId: string,
  draftId: string,
): Promise<ContentPiece> {
  return request<ContentPiece>(
    `/campaigns/${campaignId}/content/${contentId}/select-draft/${draftId}`,
    { method: 'POST' },
  );
}

export function generateDraft(
  campaignId: string,
  contentId: string,
  data: GenerateDraftData,
): Promise<AIDraft> {
  return request<AIDraft>(
    `/campaigns/${campaignId}/content/${contentId}/generate`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

// Translations
export function translateContent(
  campaignId: string,
  contentId: string,
  data: TranslateContentData,
): Promise<Translation> {
  return request<Translation>(
    `/campaigns/${campaignId}/content/${contentId}/translate`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export function compareModels(
  campaignId: string,
  contentId: string,
  data?: CompareModelsData,
): Promise<{ claude: AIDraft; gpt4o: AIDraft }> {
  return request<{ claude: AIDraft; gpt4o: AIDraft }>(
    `/campaigns/${campaignId}/content/${contentId}/compare`,
    {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    },
  );
}

// LangChain pipeline: generate → translate → summarize in one call
export function runChain(
  campaignId: string,
  contentId: string,
  data: RunChainData,
): Promise<ChainResult> {
  return request<ChainResult>(
    `/campaigns/${campaignId}/content/${contentId}/chain`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export { ApiError };
