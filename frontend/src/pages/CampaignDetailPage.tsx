import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, Globe, FileText } from 'lucide-react';
import { useCampaign } from '../hooks/useCampaigns';
import { useContentByCampaign, useCreateContent } from '../hooks/useContent';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import { CONTENT_TYPE_LABELS, REVIEW_STATE_COLORS, REVIEW_STATE_LABELS, LANGUAGE_LABELS } from '../lib/utils';
import type { ContentType } from '../types';

const CONTENT_TYPES: ContentType[] = ['headline', 'description', 'body', 'cta', 'tagline'];

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = useCampaign(id!);
  const { data: contentPieces } = useContentByCampaign(id!);
  const createContent = useCreateContent(id!);
  useRealtimeUpdates(id);

  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<ContentType>('headline');
  const [newText, setNewText] = useState('');

  const handleAddContent = (e: React.FormEvent) => {
    e.preventDefault();
    createContent.mutate(
      { type: newType, originalText: newText || undefined },
      { onSuccess: () => { setShowForm(false); setNewText(''); } },
    );
  };

  if (isLoading) return <p className="text-gray-500 text-center py-12">Loading...</p>;
  if (!campaign) return <p className="text-red-500 text-center py-12">Campaign not found</p>;

  return (
    <div>
      <Link to="/campaigns" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back to Campaigns
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            {campaign.description && <p className="text-sm text-gray-500 mt-2">{campaign.description}</p>}
          </div>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            {campaign.status}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Globe size={12} />
            {campaign.sourceLanguage.toUpperCase()} → {campaign.targetLanguages.map((l) => LANGUAGE_LABELS[l] || l).join(', ') || 'None'}
          </span>
          <span className="flex items-center gap-1">
            <FileText size={12} />
            {contentPieces?.length ?? 0} content pieces
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Content Pieces</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Add Content
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddContent} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex gap-3">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as ContentType)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Original text (optional, AI can generate)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button type="submit" disabled={createContent.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {createContent.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {contentPieces?.map((piece) => {
          const latestDraft = piece.aiDrafts?.[0];
          return (
            <Link
              key={piece.id}
              to={`/campaigns/${id}/content/${piece.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                    {CONTENT_TYPE_LABELS[piece.type]}
                  </span>
                  <span className="text-xs text-gray-400">{piece.language.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  {latestDraft && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${REVIEW_STATE_COLORS[latestDraft.reviewState]}`}>
                      {REVIEW_STATE_LABELS[latestDraft.reviewState]}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Sparkles size={12} />
                    {piece._count?.aiDrafts ?? 0} drafts
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">
                {piece.originalText || <span className="italic text-gray-400">No text yet — generate with AI</span>}
              </p>
            </Link>
          );
        })}

        {contentPieces?.length === 0 && (
          <p className="text-center text-gray-400 py-8">No content pieces yet. Add one above!</p>
        )}
      </div>
    </div>
  );
}
