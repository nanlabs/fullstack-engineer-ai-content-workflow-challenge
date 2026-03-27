'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  X,
  FileText,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useCampaign } from '@/hooks/use-campaigns';
import { useContentList } from '@/hooks/use-content';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/components/ui/toast';
import { ContentCard } from '@/components/content/content-card';
import { ContentForm } from '@/components/content/content-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageBadge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import type { CreateContentData } from '@/types';

function SkeletonContentCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-gray-200 rounded-full" />
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
        </div>
        <div className="h-8 w-16 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { campaign, isLoading: campaignLoading, error: campaignError } =
    useCampaign(campaignId);

  const {
    contentList,
    isLoading: contentLoading,
    error: contentError,
    refresh,
    createContent,
  } = useContentList(campaignId);

  const { addToast } = useToast();

  const handleContentUpdated = useCallback(
    (data: { campaignId: string }) => {
      if (data.campaignId === campaignId) {
        refresh();
      }
    },
    [campaignId, refresh],
  );

  useRealtime({ onContentUpdated: handleContentUpdated });

  async function handleCreateContent(data: CreateContentData) {
    setIsCreating(true);
    try {
      await createContent(data);
      setShowForm(false);
      addToast('Content piece added', 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to add content',
        'error',
      );
    } finally {
      setIsCreating(false);
    }
  }

  const isLoading = campaignLoading || contentLoading;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All campaigns
      </Link>

      {/* Campaign header */}
      {campaignLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-7 w-64 bg-gray-200 rounded" />
          <div className="h-4 w-96 bg-gray-100 rounded" />
        </div>
      ) : campaignError ? (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {campaignError}
        </div>
      ) : campaign ? (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {campaign.name}
          </h1>
          {campaign.description && (
            <p className="mt-1 text-sm text-gray-500 max-w-2xl">
              {campaign.description}
            </p>
          )}
          {campaign.targetLangs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {campaign.targetLangs.map((lang) => (
                <LanguageBadge key={lang} language={lang} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Content section header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Content Pieces</h2>
          {!contentLoading && (
            <p className="text-sm text-gray-500">
              {contentList.length} {contentList.length === 1 ? 'piece' : 'pieces'} in
              this campaign
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={contentLoading}
            aria-label="Refresh content"
          >
            <RefreshCw
              className={`h-4 w-4 ${contentLoading ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
            {showForm ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Content
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Inline content form */}
      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              New Content Piece
            </h3>
            <ContentForm
              onSubmit={handleCreateContent}
              onCancel={() => setShowForm(false)}
              isLoading={isCreating}
            />
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {contentError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {contentError}
        </div>
      )}

      {/* Loading */}
      {contentLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonContentCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!contentLoading && !contentError && contentList.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
            <FileText className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">
            No content pieces yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your first content piece to start generating AI drafts.
          </p>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add Content
          </Button>
        </div>
      )}

      {/* Content list */}
      {!contentLoading && contentList.length > 0 && (
        <div className="space-y-3">
          {contentList.map((content) => (
            <ContentCard
              key={content.id}
              content={content}
              campaignId={campaignId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
