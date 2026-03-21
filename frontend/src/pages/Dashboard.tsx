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
  const [languages, setLanguages] = useState('en,es');

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
      setLanguages('en,es');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      description: description || undefined,
      targetLanguages: languages.split(',').map((l) => l.trim()).filter(Boolean),
    });
  };

  if (isLoading) return <div className="p-8 text-center">Loading campaigns...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {showForm ? 'Cancel' : '+ New Campaign'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-white rounded-lg shadow p-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            className="w-full border rounded px-3 py-2"
            rows={2}
          />
          <input
            type="text"
            placeholder="Target languages (comma-separated, e.g. en,es,fr)"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
          </button>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">{createMutation.error.message}</p>
          )}
        </form>
      )}

      {!campaigns?.length ? (
        <p className="text-gray-500">No campaigns yet. Create one to get started.</p>
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
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition block"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{c.name}</h2>
                    {c.description && (
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <div className="flex gap-1 mt-2">
                      {c.targetLanguages.map((lang) => (
                        <span
                          key={lang}
                          className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-gray-400">
                      {(c.contentPieces ?? []).length} pieces
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap justify-end">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <span key={status} className="flex items-center gap-1">
                          <StatusBadge status={status as ContentStatus} />
                          <span className="text-xs text-gray-400">{count}</span>
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
