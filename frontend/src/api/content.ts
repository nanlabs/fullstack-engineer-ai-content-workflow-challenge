import { apiFetch } from './client';
import type { ContentPiece, ContentType } from '../types';

export const contentApi = {
  listByCampaign: (campaignId: string) =>
    apiFetch<ContentPiece[]>(`/campaigns/${campaignId}/content`),

  get: (id: string) => apiFetch<ContentPiece>(`/content/${id}`),

  create: (campaignId: string, data: { type: ContentType; originalText?: string; language?: string }) =>
    apiFetch<ContentPiece>(`/campaigns/${campaignId}/content`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<ContentPiece>) =>
    apiFetch<ContentPiece>(`/content/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (id: string) =>
    apiFetch<ContentPiece>(`/content/${id}`, { method: 'DELETE' }),
};
