'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type {
  ContentPiece,
  AIDraft,
  Translation,
  CreateContentData,
  ReviewContentData,
  GenerateDraftData,
  TranslateContentData,
  CompareModelsData,
} from '@/types';

interface UseContentListReturn {
  contentList: ContentPiece[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createContent: (data: CreateContentData) => Promise<ContentPiece>;
}

export function useContentList(campaignId: string): UseContentListReturn {
  const [contentList, setContentList] = useState<ContentPiece[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getContent(campaignId);
      setContentList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const createContent = useCallback(
    async (data: CreateContentData): Promise<ContentPiece> => {
      const piece = await api.createContent(campaignId, data);
      setContentList((prev) => [piece, ...prev]);
      return piece;
    },
    [campaignId],
  );

  return {
    contentList,
    isLoading,
    error,
    refresh: fetchContent,
    createContent,
  };
}

interface UseContentPieceReturn {
  content: ContentPiece | null;
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
  isComparing: boolean;
  isTranslating: boolean;
  isReviewing: boolean;
  refresh: () => Promise<void>;
  generateDraft: (data: GenerateDraftData) => Promise<AIDraft>;
  compareModels: (data?: CompareModelsData) => Promise<{ claude: AIDraft; gpt4o: AIDraft }>;
  selectDraft: (draftId: string) => Promise<void>;
  reviewContent: (data: ReviewContentData) => Promise<void>;
  translateContent: (data: TranslateContentData) => Promise<Translation>;
}

export function useContentPiece(
  campaignId: string,
  contentId: string,
): UseContentPieceReturn {
  const [content, setContent] = useState<ContentPiece | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchContent = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getContentPiece(campaignId, contentId);
      setContent(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load content piece',
      );
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, contentId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const generateDraft = useCallback(
    async (data: GenerateDraftData): Promise<AIDraft> => {
      setIsGenerating(true);
      try {
        const draft = await api.generateDraft(campaignId, contentId, data);
        await fetchContent();
        return draft;
      } finally {
        setIsGenerating(false);
      }
    },
    [campaignId, contentId, fetchContent],
  );

  const compareModelsFn = useCallback(
    async (data?: CompareModelsData): Promise<{ claude: AIDraft; gpt4o: AIDraft }> => {
      setIsComparing(true);
      try {
        const result = await api.compareModels(campaignId, contentId, data);
        await fetchContent();
        return result;
      } finally {
        setIsComparing(false);
      }
    },
    [campaignId, contentId, fetchContent],
  );

  const selectDraft = useCallback(
    async (draftId: string): Promise<void> => {
      await api.selectDraft(campaignId, contentId, draftId);
      setContent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          aiDrafts: prev.aiDrafts?.map((d) => ({
            ...d,
            isSelected: d.id === draftId,
          })),
        };
      });
    },
    [campaignId, contentId],
  );

  const reviewContentFn = useCallback(
    async (data: ReviewContentData): Promise<void> => {
      setIsReviewing(true);
      try {
        const updated = await api.reviewContent(campaignId, contentId, data);
        setContent(updated);
      } finally {
        setIsReviewing(false);
      }
    },
    [campaignId, contentId],
  );

  const translateContentFn = useCallback(
    async (data: TranslateContentData): Promise<Translation> => {
      setIsTranslating(true);
      try {
        const translation = await api.translateContent(campaignId, contentId, data);
        await fetchContent();
        return translation;
      } finally {
        setIsTranslating(false);
      }
    },
    [campaignId, contentId, fetchContent],
  );

  return {
    content,
    isLoading,
    error,
    isGenerating,
    isComparing,
    isTranslating,
    isReviewing,
    refresh: fetchContent,
    generateDraft,
    compareModels: compareModelsFn,
    selectDraft,
    reviewContent: reviewContentFn,
    translateContent: translateContentFn,
  };
}
