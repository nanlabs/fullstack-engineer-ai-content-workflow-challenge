import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, contentApi } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

const PAGE_SIZE = 10;

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [editingLangs, setEditingLangs] = useState(false);
  const [langInput, setLangInput] = useState('');
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

  const handleAddLang = () => {
    const lang = langInput.trim().toLowerCase();
    if (!lang || !campaign) return;
    if (campaign.targetLanguages.includes(lang)) {
      setLangInput('');
      return;
    }
    updateLangs.mutate([...campaign.targetLanguages, lang]);
    setLangInput('');
  };

  const handleRemoveLang = (lang: string) => {
    if (!campaign) return;
    updateLangs.mutate(campaign.targetLanguages.filter((l) => l !== lang));
  };

  const handleLangKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLang();
    }
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
        <Link to="/" className="text-zinc-500 hover:text-zinc-900 transition-colors text-sm inline-flex items-center gap-2 font-medium">
          ← Back to Campaigns
        </Link>
        <button
          onClick={() => {
            if (window.confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) {
              deleteCampaign.mutate();
            }
          }}
          disabled={deleteCampaign.isPending}
          className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {deleteCampaign.isPending ? 'Deleting…' : 'Delete Campaign'}
        </button>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{campaign.name}</h1>
        {campaign.description && (
          <p className="text-zinc-500 mt-2 text-base max-w-2xl">{campaign.description}</p>
        )}
        <div className="flex gap-2 mt-4 items-center flex-wrap">
          {campaign.targetLanguages.map((lang) => (
            <span
              key={lang}
              className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider inline-flex items-center gap-1.5"
            >
              {lang}
              {editingLangs && (
                <button
                  onClick={() => handleRemoveLang(lang)}
                  className="text-zinc-400 hover:text-red-500 transition-colors"
                  title={`Remove ${lang}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {editingLangs ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={langInput}
                onChange={(e) => setLangInput(e.target.value)}
                onKeyDown={handleLangKeyDown}
                placeholder="e.g. fr"
                maxLength={10}
                className="input-field w-20 !py-1 text-xs"
              />
              <button onClick={handleAddLang} className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                Add
              </button>
              <button onClick={() => setEditingLangs(false)} className="text-zinc-400 hover:text-zinc-600 text-sm font-medium">
                Done
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingLangs(true)}
              className="text-zinc-400 hover:text-zinc-600 text-xs font-medium transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-200">
        <h2 className="text-xl font-semibold text-zinc-900">Content Pieces</h2>
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
          className="mb-8 card p-6 space-y-4 bg-zinc-50/50"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Title or Topic</label>
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
        <div className="text-center py-12 card bg-zinc-50 border-dashed">
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
                  <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors text-lg">{piece.title}</h3>
                  <div className="flex gap-2 mt-2 items-center">
                    <span className="text-xs font-medium text-zinc-500 uppercase">{piece.language}</span>
                    {piece.aiModel && (
                      <>
                        <span className="text-xs text-zinc-300">•</span>
                        <span className="text-[11px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">{piece.aiModel}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {piece.translations && piece.translations.length > 0 && (
                    <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-1 rounded-md">
                      {piece.translations.length} translations
                    </span>
                  )}
                  <StatusBadge status={piece.status} />
                </div>
              </div>
            </Link>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 mt-2">
              <span className="text-sm text-zinc-500">
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
