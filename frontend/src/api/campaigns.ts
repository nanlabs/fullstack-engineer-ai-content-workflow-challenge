import { apiFetch } from './client';
import type { Campaign, PaginatedResponse } from '../types';

export const campaignsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiFetch<PaginatedResponse<Campaign>>(`/campaigns${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => apiFetch<Campaign>(`/campaigns/${id}`),

  create: (data: { name: string; description?: string; targetLanguages?: string[]; sourceLanguage?: string }) =>
    apiFetch<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Campaign>) =>
    apiFetch<Campaign>(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (id: string) =>
    apiFetch<Campaign>(`/campaigns/${id}`, { method: 'DELETE' }),
};
