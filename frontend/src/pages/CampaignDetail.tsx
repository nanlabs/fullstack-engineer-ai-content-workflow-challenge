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
      <Link to="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← Back to Campaigns
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        {campaign.description && (
          <p className="text-gray-500 mt-1">{campaign.description}</p>
        )}
        <div className="flex gap-1 mt-2">
          {campaign.targetLanguages.map((lang) => (
            <span
              key={lang}
              className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs"
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Content Pieces</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Content'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-4 bg-white rounded-lg shadow p-4 space-y-3"
        >
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ContentType)}
            className="w-full border rounded px-3 py-2"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Title / topic"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={500}
            className="w-full border rounded px-3 py-2"
          />
          <button
            type="submit"
            disabled={createContent.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {createContent.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {!campaign.contentPieces?.length ? (
        <p className="text-gray-500">No content pieces yet.</p>
      ) : (
        <div className="grid gap-3">
          {campaign.contentPieces.map((piece) => (
            <Link
              key={piece.id}
              to={`/content/${piece.id}`}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{piece.title}</h3>
                  <div className="flex gap-2 mt-1 items-center">
                    <span className="text-xs text-gray-400">
                      {piece.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{piece.language}</span>
                    {piece.aiModel && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-purple-500">{piece.aiModel}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={piece.status} />
                  {piece.translations && piece.translations.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {piece.translations.length} translations
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
