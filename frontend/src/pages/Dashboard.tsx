import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { campaignsApi } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import type { ContentStatus } from '../lib/types';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [languages, setLanguages] = useState<string[]>(['en', 'es']);
  const [langInput, setLangInput] = useState('');

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: campaignsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowForm(false);
      setName('');
      setDescription('');
      setLanguages(['en', 'es']);
      setLangInput('');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!languages.length) return;
    createMutation.mutate({
      name,
      description: description || undefined,
      targetLanguages: languages,
    });
  };

  if (isLoading) return <div className="p-8 text-center">Loading campaigns...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Campaigns</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-secondary' : 'btn-primary'}
        >
          {showForm ? 'Cancel' : '+ New Campaign'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-8 card p-6 space-y-4 bg-zinc-50/50"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Campaign Name</label>
            <input
              type="text"
              placeholder="e.g. Summer Sale 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <textarea
              placeholder="Brief overview of the campaign..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              className="input-field"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Target Languages</label>
            {/* Quick picks */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['en', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'zh', 'ar', 'ru'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    if (!languages.includes(l)) setLanguages((prev) => [...prev, l]);
                  }}
                  className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors ${
                    languages.includes(l)
                      ? 'bg-zinc-800 text-white border-zinc-800'
                      : 'bg-white text-zinc-500 border-zinc-300 hover:border-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {/* Selected tags */}
            <div className="flex flex-wrap gap-1.5 min-h-[2rem] p-2 border border-zinc-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-zinc-900 focus-within:border-transparent">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider"
                >
                  {lang}
                  <button
                    type="button"
                    onClick={() => setLanguages((prev) => prev.filter((l) => l !== lang))}
                    className="text-zinc-400 hover:text-red-500 transition-colors leading-none"
                    aria-label={`Remove ${lang}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={langInput}
                onChange={(e) => setLangInput(e.target.value.replace(/[^a-z-]/gi, '').toLowerCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const val = langInput.trim();
                    if (val && !languages.includes(val)) setLanguages((prev) => [...prev, val]);
                    setLangInput('');
                  } else if (e.key === 'Backspace' && !langInput && languages.length) {
                    setLanguages((prev) => prev.slice(0, -1));
                  }
                }}
                placeholder={languages.length ? '' : 'Type a code and press Enter…'}
                className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400"
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">Type a language code (e.g. &ldquo;fr&rdquo;) and press Enter or comma to add.</p>
            {languages.length === 0 && <p className="text-xs text-red-500 mt-1">At least one language is required.</p>}
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-red-500 text-sm mt-2">{createMutation.error.message}</p>
          )}
        </form>
      )}

      {!campaigns?.length ? (
        <div className="text-center py-12 card bg-zinc-50 border-dashed">
          <p className="text-zinc-500 text-sm">No campaigns yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => {
            const statusCounts = (c.contentPieces ?? []).reduce(
              (acc, p) => {
                const s = p.status as ContentStatus;
                acc[s] = (acc[s] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            );

            return (
              <Link
                key={c.id}
                to={`/campaigns/${c.id}`}
                className="card card-hoverable p-5 block group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">{c.name}</h2>
                    {c.description && (
                      <p className="text-zinc-500 text-sm mt-1 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      {c.targetLanguages.map((lang) => (
                        <span
                          key={lang}
                          className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-zinc-500 font-medium">
                      {(c.contentPieces ?? []).length} pieces
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap justify-end">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <span key={status} className="flex items-center gap-1.5">
                          <StatusBadge status={status as ContentStatus} />
                          <span className="text-xs text-zinc-400 font-medium">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
