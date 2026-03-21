import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, contentApi } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import type { ContentType } from '../lib/types';

const CONTENT_TYPES: ContentType[] = [
  'HEADLINE',
  'PRODUCT_DESCRIPTION',
  'AD_COPY',
  'BLOG_POST',
];

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ContentType>('HEADLINE');

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignsApi.get(id!),
    enabled: !!id,
  });

  const createContent = useMutation({
    mutationFn: (data: { type: string; title: string }) =>
      contentApi.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
      setShowForm(false);
      setTitle('');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createContent.mutate({ type, title });
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!campaign) return <div className="p-8 text-center">Campaign not found</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link to="/" className="text-zinc-500 hover:text-zinc-900 transition-colors text-sm mb-8 inline-flex items-center gap-2 font-medium">
        ← Back to Campaigns
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{campaign.name}</h1>
        {campaign.description && (
          <p className="text-zinc-500 mt-2 text-base max-w-2xl">{campaign.description}</p>
        )}
        <div className="flex gap-2 mt-4">
          {campaign.targetLanguages.map((lang) => (
            <span
              key={lang}
              className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider"
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200">
        <h2 className="text-xl font-semibold text-zinc-900">Content Pieces</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-secondary' : 'btn-primary'}
        >
          {showForm ? 'Cancel' : '+ Add Content'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-8 card p-6 space-y-4 bg-zinc-50/50"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Content Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ContentType)}
              className="input-field"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
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
      ) : (
        <div className="grid gap-4">
          {campaign.contentPieces.map((piece) => (
            <Link
              key={piece.id}
              to={`/content/${piece.id}`}
              className="card card-hoverable p-5 block group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors text-lg">{piece.title}</h3>
                  <div className="flex gap-2 mt-2 items-center">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      {piece.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-zinc-300">•</span>
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
        </div>
      )}
    </div>
  );
}
