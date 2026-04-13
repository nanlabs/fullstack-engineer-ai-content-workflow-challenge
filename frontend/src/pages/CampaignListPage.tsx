import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Globe, FileText } from 'lucide-react';
import { useCampaigns } from '../hooks/useCampaigns';
import { LANGUAGE_LABELS } from '../lib/utils';
import type { CampaignStatus } from '../types';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};

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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your marketing campaigns and AI content</p>
        </div>
        <Link
          to="/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Campaign
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as CampaignStatus | ''); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500 text-center py-12">Loading campaigns...</p>}
      {error && <p className="text-red-500 text-center py-12">Error: {(error as Error).message}</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.data.map((campaign) => (
              <Link
                key={campaign.id}
                to={`/campaigns/${campaign.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 truncate flex-1">{campaign.name}</h3>
                  <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[campaign.status]}`}>
                    {campaign.status}
                  </span>
                </div>
                {campaign.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{campaign.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Globe size={12} />
                    {campaign.targetLanguages.map((l) => LANGUAGE_LABELS[l] || l).join(', ') || 'No targets'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    {campaign._count?.contentPieces ?? 0} pieces
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {data.data.length === 0 && (
            <p className="text-center text-gray-400 py-12">No campaigns found. Create your first one!</p>
          )}

          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {data.meta.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40"
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
