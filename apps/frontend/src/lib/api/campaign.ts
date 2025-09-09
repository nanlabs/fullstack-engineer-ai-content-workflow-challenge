import type { Campaign } from '../types';
import { api } from './util';
import { toast } from 'sonner';

export async function create(data: Partial<Campaign>) {
  try {
    const response = api.post<Campaign, Partial<Campaign>>('/campaigns', data);

    toast.success('Campaign has been created', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Campaign has not been created', {
      description: new Date().toLocaleString(),
    });
  }
}

export async function update(campaignId: string, data: Partial<Campaign>) {
  try {
    const response = api.put<Campaign, Partial<Campaign>>(`/campaigns/${campaignId}`, data);

    toast.success('Campaign has been updated', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Campaign has not been updated', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}

export async function remove(campaignId: string) {
  try {
    const response = await api.delete<Campaign>(`/campaigns/${campaignId}`);
    toast.success('Campaign has been deleted', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Campaign has not been deleted', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}
