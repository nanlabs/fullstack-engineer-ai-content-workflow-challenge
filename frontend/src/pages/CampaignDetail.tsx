import { Link, useLoaderData, useNavigate } from 'react-router-dom'

import ContentCard from '../components/ContentCard'
import EmptyState from '../components/EmptyState'
import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'
import { useCampaignContent } from '../hooks/useCampaignContent'
import { useCampaignSettings } from '../hooks/useCampaignSettings'
import { formatDate, formatLanguages } from '../lib/format'
import type { Campaign, CampaignStatus } from '../lib/types'

const statusOptions: CampaignStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED']
const statusTone: Record<CampaignStatus, 'accent' | 'warning' | 'neutral'> = {
  ACTIVE: 'accent',
  PAUSED: 'warning',
  ARCHIVED: 'neutral',
}

export default function CampaignDetail() {
  const initialCampaign = useLoaderData() as Campaign
  const navigate = useNavigate()
  const {
    campaign,
    campaignError,
    handleCampaignUpdate,
    handleDeleteCampaign,
    isUpdating,
    setStatus,
    setTargetLanguages,
    status,
    targetLanguages,
  } = useCampaignSettings({
    initialCampaign,
    onDeleted: () => navigate('/'),
  })
  const {
    contentError,
    generatingId,
    handleCreateContent,
    handleDeleteContent,
    handleGenerateDraft,
    isCreating,
    originalText,
    setOriginalText,
    setTitle,
    setType,
    sortedContent,
    title,
    type,
  } = useCampaignContent({
    campaignId: campaign.id,
    initialContentPieces: initialCampaign.contentPieces ?? [],
  })

  return (
    <section className="space-y-8">
      <SectionHeader
        title={campaign.name}
        subtitle={campaign.description || 'Campaign overview and content pipeline status.'}
        action={
          <Link
            to="/"
            className="rounded-full border border-[var(--line)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)]"
          >
            Back to dashboard
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Campaign status</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <StatusBadge label={campaign.status} tone={statusTone[campaign.status]} />
                  <span className="text-xs text-[var(--muted)]">Updated {formatDate(campaign.updatedAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={formatLanguages(campaign.targetLanguages)} tone="neutral" />
              </div>
            </div>
          </div>

          {contentError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {contentError}
            </div>
          ) : null}

          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-xl font-semibold">Content pipeline</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Generate drafts, request translations, and send work for review with live status updates.
            </p>
            <div className="mt-6 space-y-4">
              {sortedContent.length === 0 ? (
                <EmptyState
                  title="No content pieces yet"
                  description="Add your first content brief to kick off AI drafting."
                />
              ) : (
                sortedContent.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    generating={generatingId === content.id}
                    onGenerateDraft={() => handleGenerateDraft(content.id)}
                    onDelete={() => handleDeleteContent(content.id)}
                  />
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCreateContent} className="glass-panel rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold">Add content piece</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Provide a clear brief so AI can generate a strong first draft.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Launch email headline"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Type</label>
                <input
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  placeholder="Email, Blog, Social"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Original text</label>
              <textarea
                value={originalText}
                onChange={(event) => setOriginalText(event.target.value)}
                rows={4}
                placeholder="Describe the message and key points for the draft."
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Adding...' : 'Add content'}
            </button>
          </form>
        </div>

        <aside className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Campaign settings</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">Tune status and target locales for this initiative.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as CampaignStatus)}
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Target languages
              </label>
              <textarea
                value={targetLanguages}
                onChange={(event) => setTargetLanguages(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
              />
            </div>
            {campaignError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {campaignError}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleCampaignUpdate}
              disabled={isUpdating}
              className="w-full rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating ? 'Saving...' : 'Update campaign'}
            </button>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
            <h3 className="text-lg font-semibold text-rose-700">Danger zone</h3>
            <p className="mt-2 text-sm text-rose-600">
              Deleting a campaign removes all linked content pieces. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={handleDeleteCampaign}
              className="mt-4 w-full rounded-full border border-rose-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700"
            >
              Delete campaign
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}
