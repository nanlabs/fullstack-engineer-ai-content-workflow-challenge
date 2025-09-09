import type { ModelProvider } from '@/context/GenerationConfigContext';
import type { ContentPiece } from '../types';
import { api } from './util';
import { toast } from 'sonner';

export async function create(data: ContentPiece) {
  try {
    const response = await api.post<ContentPiece, Partial<ContentPiece>>('/content-pieces', data);
    toast.success('Content piece has been created', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Content piece has NOT been created', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}

export async function update(contentPieceId: string, data: Partial<ContentPiece>) {
  try {
    const response = await api.put<ContentPiece, Partial<ContentPiece>>(`/content-pieces/${contentPieceId}`, data);
    toast.success('Content piece has been updated', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Content piece has NOT been updated', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}

export async function remove(contentPieceId: string) {
  try {
    const response = await api.delete<ContentPiece>(`/content-pieces/${contentPieceId}`);
    toast.success('Content piece has been deleted', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Content piece has NOT been deleted', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}

export async function generateDraft(
  campaignId: string,
  locale: string,
  modelProvider: ModelProvider,
  contentId?: string,
) {
  try {
    const response = await api.post<
      ContentPiece,
      {
        campaignId: string;
        locale: string;
        modelProvider: ModelProvider;
        id?: string;
      }
    >(`/content-pieces/generate`, {
      campaignId,
      locale,
      modelProvider,
      id: contentId,
    });

    toast.success('Content piece draft generated', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Content piece draft generation failed', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}

// approve or reject a content piece
export async function approve(contentPieceId: string) {
  try {
    const response = await api.post<ContentPiece, undefined>(`/content-pieces/${contentPieceId}/approve`, undefined);
    toast.success('Content piece has been approved', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Content piece has NOT been approved', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}

export async function reject(contentPieceId: string) {
  try {
    const response = await api.post<ContentPiece, undefined>(`/content-pieces/${contentPieceId}/reject`, undefined);
    toast.success('Content piece has been rejected', {
      description: new Date().toLocaleString(),
    });
    return response;
  } catch (error) {
    toast.error('Content piece has NOT been rejected', {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}

// update to reviewed
export async function markAsReviewed(contentPieceId: string) {
  try {
    const response = await api.post<ContentPiece, undefined>(`/content-pieces/${contentPieceId}/reviewed`, undefined);
    return response;
  } catch (error) {
    toast.error("Content piece has NOT been marked as 'Reviewed'", {
      description: new Date().toLocaleString(),
    });
    return null;
  }
}
