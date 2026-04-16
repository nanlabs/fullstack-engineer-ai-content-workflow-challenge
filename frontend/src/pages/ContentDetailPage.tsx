import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Globe, Brain, Check, X, RotateCcw } from 'lucide-react';
import { useContentPiece } from '../hooks/useContent';
import { useDraftsByContent, useGenerate, useTranslate, useExtract, useReviewActions } from '../hooks/useDrafts';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import {
  CONTENT_TYPE_LABELS,
  REVIEW_STATE_COLORS,
  REVIEW_STATE_LABELS,
  LANGUAGE_LABELS,
} from '../lib/utils';
import type { AiDraft } from '../types';

export function ContentDetailPage() {
  const { campaignId, contentId } = useParams<{ campaignId: string; contentId: string }>();
  const { data: piece, isLoading } = useContentPiece(contentId!);
  const { data: drafts } = useDraftsByContent(contentId!);
  useRealtimeUpdates(campaignId);

  const generate = useGenerate(contentId!);
  const translate = useTranslate(contentId!);
  const extract = useExtract(contentId!);
  const { markReviewed, approve, reject, reset } = useReviewActions();

  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'both'>('openai');
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="surface-card p-6 h-40 loading-shimmer" />
        <div className="surface-card p-5 h-28 loading-shimmer" />
      </div>
    );
  }

  if (!piece) {
    return (
      <p className="text-center py-12" style={{ color: 'var(--color-error)' }}>
        Content piece not found
      </p>
    );
  }

  const handleGenerate = () => generate.mutate({ provider });
  const handleTranslate = () => {
    const langs = piece.campaign?.targetLanguages || [];
    if (langs.length > 0) {
      translate.mutate({ targetLanguages: langs, provider: provider === 'both' ? 'openai' : provider });
    }
  };
  const handleExtract = () => extract.mutate({ provider: provider === 'both' ? 'openai' : provider });

  const renderDraftActions = (draft: AiDraft) => {
    const cid = draft.contentPieceId;

    switch (draft.reviewState) {
      case 'ai_suggested':
        return (
          <button
            onClick={() => markReviewed.mutate({ id: draft.id, contentId: cid })}
            className="btn-ghost text-xs inline-flex items-center gap-1.5"
            style={{ borderColor: 'rgba(192, 133, 50, 0.3)', color: 'var(--color-warning)' }}
          >
            Mark Reviewed
          </button>
        );
      case 'reviewed':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => approve.mutate({ id: draft.id, contentId: cid, editedText: editTexts[draft.id] })}
                className="btn-ghost text-xs inline-flex items-center gap-1.5"
                style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--color-success)' }}
              >
                <Check size={12} /> Approve
              </button>
              <button
                onClick={() => reject.mutate({ id: draft.id, contentId: cid, reviewerNotes: rejectNotes[draft.id] })}
                className="btn-ghost text-xs inline-flex items-center gap-1.5"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--color-error)' }}
              >
                <X size={12} /> Reject
              </button>
            </div>
            <input
              type="text"
              placeholder="Edit text (optional)..."
              value={editTexts[draft.id] || ''}
              onChange={(e) => setEditTexts({ ...editTexts, [draft.id]: e.target.value })}
              className="input-dark w-full text-xs"
              style={{ padding: '4px 8px' }}
            />
            <input
              type="text"
              placeholder="Rejection notes..."
              value={rejectNotes[draft.id] || ''}
              onChange={(e) => setRejectNotes({ ...rejectNotes, [draft.id]: e.target.value })}
              className="input-dark w-full text-xs"
              style={{ padding: '4px 8px' }}
            />
          </div>
        );
      case 'rejected':
        return (
          <button
            onClick={() => reset.mutate({ id: draft.id, contentId: cid })}
            className="btn-ghost text-xs inline-flex items-center gap-1.5"
          >
            <RotateCcw size={12} /> Reset to Draft
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        to={`/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-[13px] mb-5 transition-colors"
        style={{ color: 'var(--color-text-muted)', fontWeight: 510 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        <ArrowLeft size={14} /> Back to Campaign
      </Link>

      {/* Content Piece Header */}
      <div className="surface-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="badge"
            style={{ background: 'rgba(113, 112, 255, 0.12)', color: 'var(--color-accent-bright)' }}
          >
            {CONTENT_TYPE_LABELS[piece.type]}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {piece.language.toUpperCase()}
          </span>
          {piece.campaign && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              • {piece.campaign.name}
            </span>
          )}
        </div>

        {/* Original text — serif if it has AI content, otherwise regular */}
        <p
          className="mt-3 text-[15px] leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {piece.originalText || (
            <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No text yet
            </span>
          )}
        </p>

        {/* Metadata */}
        {piece.metadata && (
          <div
            className="mt-4 p-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <h4
              className="text-[11px] uppercase mb-2 tracking-wide"
              style={{ color: 'var(--color-text-muted)', fontWeight: 510 }}
            >
              Extracted Metadata
            </h4>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(piece.metadata as { keywords?: string[] }).keywords?.map((kw: string) => (
                <span
                  key={kw}
                  className="badge"
                  style={{ background: 'rgba(94, 106, 210, 0.12)', color: 'var(--color-accent-bright)', fontSize: '11px' }}
                >
                  {kw}
                </span>
              ))}
            </div>
            <div className="flex gap-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              <span>
                Tone: <strong style={{ color: 'var(--color-text-secondary)', fontWeight: 510 }}>
                  {(piece.metadata as { tone?: string }).tone}
                </strong>
              </span>
              <span>
                Sentiment: <strong style={{ color: 'var(--color-text-secondary)', fontWeight: 510 }}>
                  {(piece.metadata as { sentiment?: number }).sentiment}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── AI Controls ── */}
      <div className="surface-card p-5 mb-6">
        <h3
          className="text-sm mb-4"
          style={{ color: 'var(--color-text-primary)', fontWeight: 510 }}
        >
          AI Actions
        </h3>

        {/* Provider selector */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs" style={{ color: 'var(--color-text-muted)', fontWeight: 510 }}>
            Provider:
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
            className="pill-select"
          >
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="both">Both (Compare)</option>
          </select>
        </div>

        {/* AI Action Buttons — Cursor-inspired operation colors */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="btn-ai btn-ai-generate"
          >
            <Sparkles size={14} />
            {generate.isPending ? 'Generating...' : 'Generate Draft'}
          </button>
          <button
            onClick={handleTranslate}
            disabled={translate.isPending || !piece.originalText}
            className="btn-ai btn-ai-translate"
          >
            <Globe size={14} />
            {translate.isPending ? 'Translating...' : `Translate (${piece.campaign?.targetLanguages.length || 0} langs)`}
          </button>
          <button
            onClick={handleExtract}
            disabled={extract.isPending || !piece.originalText}
            className="btn-ai btn-ai-extract"
          >
            <Brain size={14} />
            {extract.isPending ? 'Extracting...' : 'Extract Metadata'}
          </button>
        </div>

        {/* Error messages */}
        {generate.isError && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-error)' }}>
            {(generate.error as Error).message}
          </p>
        )}
        {translate.isError && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-error)' }}>
            {(translate.error as Error).message}
          </p>
        )}
      </div>

      {/* ── Drafts List ── */}
      <h3
        className="text-lg mb-3"
        style={{ color: 'var(--color-text-primary)', fontWeight: 510, letterSpacing: '-0.288px' }}
      >
        AI Drafts {drafts && `(${drafts.length})`}
      </h3>

      <div className="space-y-3">
        {drafts?.map((draft) => (
          <div key={draft.id} className="surface-card p-4 animate-fade-in">
            {/* Draft header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`badge ${REVIEW_STATE_COLORS[draft.reviewState]}`}>
                  {REVIEW_STATE_LABELS[draft.reviewState]}
                </span>
                <span
                  className="badge"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}
                >
                  {draft.provider}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {draft.taskType}
                </span>
                {draft.targetLanguage && (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    → {LANGUAGE_LABELS[draft.targetLanguage] || draft.targetLanguage}
                  </span>
                )}
              </div>
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontWeight: 510 }}>
                {new Date(draft.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Generated text — serif editorial font (Claude-inspired) */}
            <p
              className="ai-generated-text text-sm whitespace-pre-wrap mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {draft.generatedText}
            </p>

            {/* Edited text */}
            {draft.editedText && (
              <div
                className="mb-3 p-3 rounded-lg"
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <span
                  className="text-[11px] uppercase tracking-wide"
                  style={{ color: 'var(--color-success)', fontWeight: 510 }}
                >
                  Edited
                </span>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {draft.editedText}
                </p>
              </div>
            )}

            {/* Reviewer notes */}
            {draft.reviewerNotes && (
              <div
                className="mb-3 p-3 rounded-lg"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <span
                  className="text-[11px] uppercase tracking-wide"
                  style={{ color: 'var(--color-error)', fontWeight: 510 }}
                >
                  Reviewer Notes
                </span>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {draft.reviewerNotes}
                </p>
              </div>
            )}

            {/* Actions */}
            {renderDraftActions(draft)}
          </div>
        ))}

        {drafts?.length === 0 && (
          <div className="text-center py-12">
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <Sparkles size={20} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p style={{ color: 'var(--color-text-muted)' }}>
              No drafts yet. Use the AI actions above to generate content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
