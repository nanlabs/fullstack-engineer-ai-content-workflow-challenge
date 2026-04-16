import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, Globe, FileText } from 'lucide-react';
import { useCampaign } from '../hooks/useCampaigns';
import { useContentByCampaign, useCreateContent } from '../hooks/useContent';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import { CONTENT_TYPE_LABELS, REVIEW_STATE_COLORS, REVIEW_STATE_LABELS, LANGUAGE_LABELS, STATUS_BADGE } from '../lib/utils';
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

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="surface-card p-6 h-32 loading-shimmer" />
        <div className="surface-card p-4 h-20 loading-shimmer" />
        <div className="surface-card p-4 h-20 loading-shimmer" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <p className="text-center py-12" style={{ color: 'var(--color-error)' }}>
        Campaign not found
      </p>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1.5 text-[13px] mb-5 transition-colors"
        style={{ color: 'var(--color-text-muted)', fontWeight: 510 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        <ArrowLeft size={14} /> Back to Campaigns
      </Link>

      {/* Campaign Header */}
      <div className="surface-card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl tracking-tight"
              style={{ color: 'var(--color-text-primary)', fontWeight: 510, letterSpacing: '-0.704px' }}
            >
              {campaign.name}
            </h1>
            {campaign.description && (
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                {campaign.description}
              </p>
            )}
          </div>
          <span className={`badge ${STATUS_BADGE[campaign.status]}`}>
            {campaign.status}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="flex items-center gap-1.5">
            <Globe size={12} />
            {campaign.sourceLanguage.toUpperCase()} → {campaign.targetLanguages.map((l) => LANGUAGE_LABELS[l] || l).join(', ') || 'None'}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText size={12} />
            {contentPieces?.length ?? 0} content pieces
          </span>
        </div>
      </div>

      {/* Content Pieces Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg"
          style={{ color: 'var(--color-text-primary)', fontWeight: 510, letterSpacing: '-0.288px' }}
        >
          Content Pieces
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary inline-flex items-center gap-2 text-[13px]"
        >
          <Plus size={14} /> Add Content
        </button>
      </div>

      {/* Add Content Form */}
      {showForm && (
        <form onSubmit={handleAddContent} className="surface-card p-4 mb-4 space-y-3 animate-fade-in">
          <div className="flex gap-3">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as ContentType)}
              className="pill-select"
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
              className="input-dark flex-1"
            />
            <button
              type="submit"
              disabled={createContent.isPending}
              className="btn-primary text-[13px]"
            >
              {createContent.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Content Pieces List */}
      <div className="space-y-3">
        {contentPieces?.map((piece) => {
          const latestDraft = piece.aiDrafts?.[0];
          return (
            <Link
              key={piece.id}
              to={`/campaigns/${id}/content/${piece.id}`}
              className="surface-card block p-4 group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(113, 112, 255, 0.12)',
                      color: 'var(--color-accent-bright)',
                    }}
                  >
                    {CONTENT_TYPE_LABELS[piece.type]}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {piece.language.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {latestDraft && (
                    <span className={`badge ${REVIEW_STATE_COLORS[latestDraft.reviewState]}`}>
                      {REVIEW_STATE_LABELS[latestDraft.reviewState]}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <Sparkles size={12} />
                    {piece._count?.aiDrafts ?? 0} drafts
                  </span>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {piece.originalText || (
                  <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    No text yet — generate with AI
                  </span>
                )}
              </p>
            </Link>
          );
        })}

        {contentPieces?.length === 0 && (
          <div className="text-center py-12">
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <Sparkles size={20} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p style={{ color: 'var(--color-text-muted)' }}>
              No content pieces yet. Add one above!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
