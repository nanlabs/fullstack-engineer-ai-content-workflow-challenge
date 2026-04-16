import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Globe, FileText } from 'lucide-react';
import { useCampaigns } from '../hooks/useCampaigns';
import { LANGUAGE_LABELS, STATUS_BADGE } from '../lib/utils';
import type { CampaignStatus } from '../types';

export function CampaignListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CampaignStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useCampaigns({
    page,
    search: search || undefined,
    status: status || undefined,
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl tracking-tight"
            style={{ color: 'var(--color-text-primary)', fontWeight: 510, letterSpacing: '-0.704px' }}
          >
            Campaigns
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Manage your marketing campaigns and AI content
          </p>
        </div>
        <Link to="/campaigns/new" className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> New Campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-dark w-full pl-10 pr-4"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as CampaignStatus | ''); setPage(1); }}
          className="pill-select"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface-card p-5 h-32 loading-shimmer" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="text-center py-12 rounded-lg"
          style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}
        >
          Error: {(error as Error).message}
        </div>
      )}

      {/* Campaign Grid */}
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.data.map((campaign) => (
              <Link
                key={campaign.id}
                to={`/campaigns/${campaign.id}`}
                className="surface-card block p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3
                    className="text-[15px] truncate flex-1"
                    style={{ color: 'var(--color-text-primary)', fontWeight: 510 }}
                  >
                    {campaign.name}
                  </h3>
                  <span className={`ml-2 badge ${STATUS_BADGE[campaign.status]}`}>
                    {campaign.status}
                  </span>
                </div>
                {campaign.description && (
                  <p
                    className="text-sm line-clamp-2 mb-3"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {campaign.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="flex items-center gap-1.5">
                    <Globe size={12} />
                    {campaign.targetLanguages.map((l) => LANGUAGE_LABELS[l] || l).join(', ') || 'No targets'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText size={12} />
                    {campaign._count?.contentPieces ?? 0} pieces
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {data.data.length === 0 && (
            <div className="text-center py-16">
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <FileText size={20} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <p style={{ color: 'var(--color-text-muted)' }}>
                No campaigns found. Create your first one!
              </p>
            </div>
          )}

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost"
              >
                Previous
              </button>
              <span className="text-sm px-3" style={{ color: 'var(--color-text-muted)', fontWeight: 510 }}>
                Page {page} of {data.meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="btn-ghost"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
