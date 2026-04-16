import { apiFetch } from './client';
import type { AiDraft, ExtractionMetadata } from '../types';

export const draftsApi = {
  listByContent: (contentId: string) =>
    apiFetch<AiDraft[]>(`/content/${contentId}/drafts`),

  get: (id: string) => apiFetch<AiDraft>(`/drafts/${id}`),

  generate: (contentId: string, data: { provider: 'openai' | 'anthropic' | 'both'; tone?: string; style?: string }) =>
    apiFetch<AiDraft[]>(`/content/${contentId}/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  translate: (contentId: string, data: { targetLanguages: string[]; provider: 'openai' | 'anthropic' }) =>
    apiFetch<AiDraft[]>(`/content/${contentId}/translate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  extract: (contentId: string, data?: { provider?: 'openai' | 'anthropic' }) =>
    apiFetch<ExtractionMetadata>(`/content/${contentId}/extract`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  pipeline: (contentId: string, data?: { provider?: 'openai' | 'anthropic' }) =>
    apiFetch<{ generation: AiDraft; translations: AiDraft[]; metadata: ExtractionMetadata }>(
      `/content/${contentId}/pipeline`,
      { method: 'POST', body: JSON.stringify(data || {}) },
    ),

  review: (id: string) =>
    apiFetch<AiDraft>(`/drafts/${id}/review`, { method: 'PATCH', body: '{}' }),

  approve: (id: string, editedText?: string) =>
    apiFetch<AiDraft>(`/drafts/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ editedText }),
    }),

  reject: (id: string, reviewerNotes?: string) =>
    apiFetch<AiDraft>(`/drafts/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewerNotes }),
    }),

  reset: (id: string) =>
    apiFetch<AiDraft>(`/drafts/${id}/reset`, { method: 'PATCH', body: '{}' }),
};
