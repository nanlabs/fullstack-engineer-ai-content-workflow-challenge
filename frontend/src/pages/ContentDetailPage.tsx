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

  if (isLoading) return <p className="text-gray-500 text-center py-12">Loading...</p>;
  if (!piece) return <p className="text-red-500 text-center py-12">Content piece not found</p>;

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
            className="px-3 py-1 text-xs bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
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
                className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Check size={12} /> Approve
              </button>
              <button
                onClick={() => reject.mutate({ id: draft.id, contentId: cid, reviewerNotes: rejectNotes[draft.id] })}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <X size={12} /> Reject
              </button>
            </div>
            <input
              type="text"
              placeholder="Edit text (optional)..."
              value={editTexts[draft.id] || ''}
              onChange={(e) => setEditTexts({ ...editTexts, [draft.id]: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
            <input
              type="text"
              placeholder="Rejection notes..."
              value={rejectNotes[draft.id] || ''}
              onChange={(e) => setRejectNotes({ ...rejectNotes, [draft.id]: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
          </div>
        );
      case 'rejected':
        return (
          <button
            onClick={() => reset.mutate({ id: draft.id, contentId: cid })}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <RotateCcw size={12} /> Reset to Draft
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <Link
        to={`/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={14} /> Back to Campaign
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
            {CONTENT_TYPE_LABELS[piece.type]}
          </span>
          <span className="text-xs text-gray-400">{piece.language.toUpperCase()}</span>
          {piece.campaign && (
            <span className="text-xs text-gray-400">• {piece.campaign.name}</span>
          )}
        </div>
        <p className="text-gray-800 mt-2">
          {piece.originalText || <span className="italic text-gray-400">No text yet</span>}
        </p>

        {piece.metadata && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Metadata</h4>
            <div className="flex flex-wrap gap-1 mb-2">
              {(piece.metadata as { keywords?: string[] }).keywords?.map((kw: string) => (
                <span key={kw} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{kw}</span>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Tone: <strong>{(piece.metadata as { tone?: string }).tone}</strong></span>
              <span>Sentiment: <strong>{(piece.metadata as { sentiment?: number }).sentiment}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* AI Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">AI Actions</h3>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs text-gray-500">Provider:</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
            className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
          >
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="both">Both (Compare)</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Sparkles size={14} />
            {generate.isPending ? 'Generating...' : 'Generate Draft'}
          </button>
          <button
            onClick={handleTranslate}
            disabled={translate.isPending || !piece.originalText}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Globe size={14} />
            {translate.isPending ? 'Translating...' : `Translate (${piece.campaign?.targetLanguages.length || 0} langs)`}
          </button>
          <button
            onClick={handleExtract}
            disabled={extract.isPending || !piece.originalText}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <Brain size={14} />
            {extract.isPending ? 'Extracting...' : 'Extract Metadata'}
          </button>
        </div>
        {generate.isError && <p className="text-xs text-red-500 mt-2">{(generate.error as Error).message}</p>}
        {translate.isError && <p className="text-xs text-red-500 mt-2">{(translate.error as Error).message}</p>}
      </div>

      {/* Drafts List */}
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        AI Drafts {drafts && `(${drafts.length})`}
      </h3>
      <div className="space-y-3">
        {drafts?.map((draft) => (
          <div key={draft.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${REVIEW_STATE_COLORS[draft.reviewState]}`}>
                  {REVIEW_STATE_LABELS[draft.reviewState]}
                </span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {draft.provider}
                </span>
                <span className="text-xs text-gray-400">{draft.taskType}</span>
                {draft.targetLanguage && (
                  <span className="text-xs text-gray-400">
                    → {LANGUAGE_LABELS[draft.targetLanguage] || draft.targetLanguage}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {new Date(draft.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{draft.generatedText}</p>
            {draft.editedText && (
              <div className="mb-3 p-2 bg-green-50 rounded border border-green-200">
                <span className="text-xs font-medium text-green-700">Edited: </span>
                <span className="text-sm text-green-800">{draft.editedText}</span>
              </div>
            )}
            {draft.reviewerNotes && (
              <div className="mb-3 p-2 bg-red-50 rounded border border-red-200">
                <span className="text-xs font-medium text-red-700">Reviewer: </span>
                <span className="text-sm text-red-800">{draft.reviewerNotes}</span>
              </div>
            )}
            {renderDraftActions(draft)}
          </div>
        ))}
        {drafts?.length === 0 && (
          <p className="text-center text-gray-400 py-8">No drafts yet. Use the AI actions above to generate content.</p>
        )}
      </div>
    </div>
  );
}
