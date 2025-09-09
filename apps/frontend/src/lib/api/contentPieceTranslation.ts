import type { ContentPieceTranslation } from '../types';
import { api } from './util';
import { toast } from 'sonner';

export async function create(contentPieceTranslation: ContentPieceTranslation) {
  try {
    const response = await api.post<ContentPieceTranslation, Partial<ContentPieceTranslation>>(
      '/content-piece-translations',
      contentPieceTranslation,
    );
    toast.success('Content piece translation has been created', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Content piece translation has not been created', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}

export async function update(contentPieceTranslationId: string, data: Partial<ContentPieceTranslation>) {
  try {
    const response = await api.put<ContentPieceTranslation, Partial<ContentPieceTranslation>>(
      `/content-piece-translations/${contentPieceTranslationId}`,
      data,
    );
    toast.success('Content piece translation has been updated', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Content piece translation has not been updated', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}

export async function remove(contentPieceTranslationId: string) {
  try {
    const response = await api.delete<ContentPieceTranslation>(
      `/content-piece-translations/${contentPieceTranslationId}`,
    );
    toast.success('Content piece translation has been deleted', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Content piece translation has not been deleted', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}
