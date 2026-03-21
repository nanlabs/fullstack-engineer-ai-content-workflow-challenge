import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, contentApi } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { LanguagePicker } from '../components/LanguagePicker';

const PAGE_SIZE = 10;

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [editingLangs, setEditingLangs] = useState(false);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignsApi.get(id!),
    enabled: !!id,
  });

  const createContent = useMutation({
    mutationFn: (data: { title: string }) =>
      contentApi.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
      setShowForm(false);
      setTitle('');
    },
  });

  const updateLangs = useMutation({
    mutationFn: (langs: string[]) =>
      campaignsApi.update(id!, { targetLanguages: langs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: () => campaignsApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      navigate('/');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createContent.mutate({ title });
  };

  const filteredPieces = useMemo(() => {
    const pieces = campaign?.contentPieces ?? [];
    if (!filter.trim()) return pieces;
    const q = filter.trim().toLowerCase();
    return pieces.filter((p) => p.title.toLowerCase().includes(q));
  }, [campaign?.contentPieces, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredPieces.length / PAGE_SIZE));
  const pagedPieces = filteredPieces.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!campaign) return <div className="p-8 text-center">Campaign not found</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <Link to="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-sm inline-flex items-center gap-2 font-medium">
          ← Back to Campaigns
        </Link>
        <button
          onClick={() => {
            if (window.confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) {
              deleteCampaign.mutate();
            }
          }}
          disabled={deleteCampaign.isPending}
          className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {deleteCampaign.isPending ? 'Deleting…' : 'Delete Campaign'}
        </button>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{campaign.name}</h1>
        {campaign.description && (
          <p className="text-zinc-500 mt-2 text-base max-w-2xl">{campaign.description}</p>
        )}
        <div className="mt-4">
          {editingLangs ? (
            <div className="space-y-2">
              <LanguagePicker
                selected={campaign.targetLanguages}
                onChange={(langs) => updateLangs.mutate(langs)}
              />
              <button
                onClick={() => setEditingLangs(false)}
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center flex-wrap">
              {campaign.targetLanguages.map((lang) => (
                <span
                  key={lang}
                  className="bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider"
                >
                  {lang}
                </span>
              ))}
              <button
                onClick={() => setEditingLangs(true)}
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs font-medium transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

        <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Content Pieces</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-secondary' : 'btn-primary'}
        >
          {showForm ? 'Cancel' : '+ Add Content'}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Filter by title…"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="input-field max-w-xs"
        />
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-8 card p-6 space-y-4 bg-zinc-50/50 dark:bg-zinc-800/30"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title or Topic</label>
            <input
              type="text"
              placeholder="e.g. 5 Reasons to Upgrade"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
              className="input-field"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={createContent.isPending}
              className="btn-primary"
            >
              {createContent.isPending ? 'Creating...' : 'Create Content'}
            </button>
          </div>
        </form>
      )}

      {!campaign.contentPieces?.length ? (
          <div className="text-center py-12 card bg-zinc-50 dark:bg-zinc-800/50 border-dashed">
          <p className="text-zinc-500 text-sm">No content pieces yet. Add one to begin.</p>
        </div>
      ) : filteredPieces.length === 0 ? (
        <div className="text-center py-12 card bg-zinc-50 border-dashed">
          <p className="text-zinc-500 text-sm">No content pieces match &ldquo;{filter}&rdquo;.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pagedPieces.map((piece) => (
            <Link
              key={piece.id}
              to={`/content/${piece.id}`}
              className="card card-hoverable p-5 block group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-lg">{piece.title}</h3>
                  <div className="flex gap-2 mt-2 items-center">
                    <span className="text-xs font-medium text-zinc-500 uppercase">{piece.language}</span>
                    {piece.aiModel && (
                      <>
                        <span className="text-xs text-zinc-300 dark:text-zinc-600">•</span>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800">{piece.aiModel}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {piece.translations && piece.translations.length > 0 && (
                    <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-md">
                      {piece.translations.length} translations
                    </span>
                  )}
                  <StatusBadge status={piece.status} />
                </div>
              </div>
            </Link>
          ))}

          {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700 mt-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {filteredPieces.length} result{filteredPieces.length !== 1 ? 's' : ''} &mdash; page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary !py-1 !px-3 text-sm disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary !py-1 !px-3 text-sm disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
