'use client';

import { useState } from 'react';
import { Plus, X, Megaphone, RefreshCw } from 'lucide-react';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/components/ui/toast';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import { CampaignForm } from '@/components/campaigns/campaign-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { CreateCampaignData } from '@/types';

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
      <div className="flex gap-1.5 mt-4">
        <div className="h-5 w-10 bg-gray-100 rounded-full" />
        <div className="h-5 w-10 bg-gray-100 rounded-full" />
      </div>
      <div className="flex gap-3 mt-4 text-xs">
        <div className="h-3 w-16 bg-gray-100 rounded" />
        <div className="h-3 w-20 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { campaigns, isLoading, error, refresh, createCampaign, deleteCampaign } =
    useCampaigns();
  const { addToast } = useToast();

  // Real-time: refresh when content changes flow back to campaign list
  useRealtime({
    onContentUpdated: () => {
      refresh();
    },
  });

  async function handleCreate(data: CreateCampaignData) {
    setIsCreating(true);
    try {
      await createCampaign(data);
      setShowForm(false);
      addToast('Campaign created successfully', 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to create campaign',
        'error',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this campaign? This action cannot be undone.')) return;
    try {
      await deleteCampaign(id);
      addToast('Campaign deleted', 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to delete campaign',
        'error',
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your global content campaigns and AI-generated copy.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh campaigns"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="gap-1.5"
          >
            {showForm ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                New Campaign
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Inline create form */}
      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              New Campaign
            </h2>
            <CampaignForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isLoading={isCreating}
            />
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
            <Megaphone className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first campaign.
          </p>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>
      )}

      {/* Campaign grid */}
      {!isLoading && campaigns.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
