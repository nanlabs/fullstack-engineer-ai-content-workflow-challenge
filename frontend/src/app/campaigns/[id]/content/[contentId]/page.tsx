'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  Languages,
  AlertCircle,
  RefreshCw,
  Globe2,
} from 'lucide-react';
import { useContentPiece } from '@/hooks/use-content';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/components/ui/toast';
import { GeneratePanel } from '@/components/ai/generate-panel';
import { DraftCard } from '@/components/content/draft-card';
import { ReviewPanel } from '@/components/content/review-panel';
import { TranslationCard } from '@/components/content/translation-card';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ContentTypeBadge, StatusBadge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { formatDateTime } from '@/lib/utils';
import type {
  GenerateDraftData,
  CompareModelsData,
  ReviewContentData,
  TranslateContentData,
  AIModel,
} from '@/types';
import { useState } from 'react';

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'en', label: 'English' },
];

export default function ContentDetailPage() {
  const params = useParams<{ id: string; contentId: string }>();
  const { id: campaignId, contentId } = params;

  const [selectingDraftId, setSelectingDraftId] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('es');
  const [translateModel, setTranslateModel] = useState<AIModel>('CLAUDE_3_5_SONNET');

  const {
    content,
    isLoading,
    error,
    isGenerating,
    isComparing,
    isTranslating,
    isReviewing,
    refresh,
    generateDraft,
    compareModels,
    selectDraft,
    reviewContent,
    translateContent,
  } = useContentPiece(campaignId, contentId);

  const { addToast } = useToast();

  // Real-time updates
  const handleDraftGenerated = useCallback(
    (data: { contentId: string }) => {
      if (data.contentId === contentId) {
        refresh();
      }
    },
    [contentId, refresh],
  );

  const handleTranslationCreated = useCallback(
    (data: { contentId: string }) => {
      if (data.contentId === contentId) {
        refresh();
      }
    },
    [contentId, refresh],
  );

  const handleContentUpdated = useCallback(
    (data: { contentId: string }) => {
      if (data.contentId === contentId) {
        refresh();
      }
    },
    [contentId, refresh],
  );

  useRealtime({
    onDraftGenerated: handleDraftGenerated,
    onTranslationCreated: handleTranslationCreated,
    onContentUpdated: handleContentUpdated,
  });

  async function handleGenerate(data: GenerateDraftData) {
    try {
      await generateDraft(data);
      addToast('Draft generated successfully', 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to generate draft',
        'error',
      );
    }
  }

  async function handleCompare(data?: CompareModelsData) {
    try {
      await compareModels(data);
      addToast('Model comparison complete', 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to compare models',
        'error',
      );
    }
  }

  async function handleSelectDraft(draftId: string) {
    setSelectingDraftId(draftId);
    try {
      await selectDraft(draftId);
      addToast('Draft selected', 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to select draft',
        'error',
      );
    } finally {
      setSelectingDraftId(null);
    }
  }

  async function handleReview(data: ReviewContentData) {
    try {
      await reviewContent(data);
      addToast('Review saved', 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save review',
        'error',
      );
    }
  }

  async function handleTranslate() {
    try {
      await translateContent({ targetLanguage: targetLang, model: translateModel });
      addToast('Translation complete', 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to translate content',
        'error',
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="space-y-4">
        <Link
          href={`/campaigns/${campaignId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaign
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error ?? 'Content piece not found'}
        </div>
      </div>
    );
  }

  const sortedDrafts = [...(content.aiDrafts ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const sortedTranslations = [...(content.translations ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6">
      {/* Back + refresh */}
      <div className="flex items-center justify-between">
        <Link
          href={`/campaigns/${campaignId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaign
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Content piece info card */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ContentTypeBadge type={content.type} />
                <StatusBadge status={content.status} />
                <span className="text-xs text-gray-400">
                  Updated {formatDateTime(content.updatedAt)}
                </span>
              </div>
              <p className="mt-3 text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                {content.originalText}
              </p>
              {content.reviewNotes && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-800">
                  <span className="font-medium">Review note:</span>{' '}
                  {content.reviewNotes}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: generation + drafts */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Generation panel */}
          <GeneratePanel
            onGenerate={handleGenerate}
            onCompare={handleCompare}
            isGenerating={isGenerating}
            isComparing={isComparing}
          />

          {/* Drafts */}
          {sortedDrafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">
                  AI Drafts{' '}
                  <span className="text-gray-400 font-normal">
                    ({sortedDrafts.length})
                  </span>
                </h3>
              </div>
              {sortedDrafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onSelect={handleSelectDraft}
                  isSelecting={selectingDraftId === draft.id}
                />
              ))}
            </div>
          )}

          {/* Translations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Translations</h3>
            </div>

            {/* Translate form */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-700">
                    Request Translation
                  </h4>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="target-lang">Target Language</Label>
                    <Select
                      id="target-lang"
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      disabled={isTranslating}
                    >
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="translate-model">Model</Label>
                    <Select
                      id="translate-model"
                      value={translateModel}
                      onChange={(e) =>
                        setTranslateModel(e.target.value as AIModel)
                      }
                      disabled={isTranslating}
                    >
                      <option value="CLAUDE_3_5_SONNET">Claude 3.5 Sonnet</option>
                      <option value="GPT_4O">GPT-4o</option>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleTranslate}
                  isLoading={isTranslating}
                  size="sm"
                  className="w-full"
                >
                  <Languages className="h-3.5 w-3.5" />
                  Translate
                </Button>
              </CardContent>
            </Card>

            {/* Translation list */}
            {sortedTranslations.length > 0 ? (
              <div className="space-y-3">
                {sortedTranslations.map((translation) => (
                  <TranslationCard key={translation.id} translation={translation} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white py-8 text-center">
                <Globe2 className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No translations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: review */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <ReviewPanel
              currentStatus={content.status}
              currentNotes={content.reviewNotes}
              onSave={handleReview}
              isLoading={isReviewing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
