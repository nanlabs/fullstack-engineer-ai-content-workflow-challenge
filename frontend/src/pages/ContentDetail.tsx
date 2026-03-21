import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi, aiApi } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Accordion } from '../components/Accordion';
import { ContentCard } from '../components/ContentCard';
import { ModelComparison } from '../components/ModelComparison';
import { MetadataPanel } from '../components/MetadataPanel';
import { ConfirmModal } from '../components/ConfirmModal';
import type { ContentStatus, CompareResponse } from '../lib/types';

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [translateLang, setTranslateLang] = useState('');
  const [compareModels, setCompareModels] = useState<string[]>([]);
  const [promptModal, setPromptModal] = useState<{ action: 'generate' | 'chain' } | null>(null);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [modalModel, setModalModel] = useState<string | undefined>();
  const [modalWordCount, setModalWordCount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTranslationTarget, setDeleteTranslationTarget] = useState<{ id: string; language: string } | null>(null);

  const { data: piece, isLoading } = useQuery({
    queryKey: ['content', id],
    queryFn: () => contentApi.get(id!),
    enabled: !!id,
  });

  const { data: providers } = useQuery({
    queryKey: ['providers'],
    queryFn: aiApi.providers,
  });

  useEffect(() => {
    if (providers?.all && compareModels.length === 0) {
      setCompareModels(providers.available);
    }
  }, [providers?.all]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['content', id] });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  };

  const generateMut = useMutation({
    mutationFn: (params: { prompt?: string; model?: string; wordCount?: number }) =>
      aiApi.generate(id!, params.model, params.prompt, params.wordCount),
    onSuccess: invalidate,
  });

  const translateMut = useMutation({
    mutationFn: () => aiApi.translate(id!, translateLang),
    onSuccess: () => {
      invalidate();
      setTranslateLang('');
    },
  });

  const retranslateMut = useMutation({
    mutationFn: (lang: string) => aiApi.translate(id!, lang),
    onSuccess: invalidate,
  });

  const deleteTranslationMut = useMutation({
    mutationFn: (translationId: string) => contentApi.delete(translationId),
    onSuccess: invalidate,
  });

  const extractMut = useMutation({
    mutationFn: () => aiApi.extract(id!),
    onSuccess: invalidate,
  });

  const chainMut = useMutation({
    mutationFn: (params: { prompt?: string; model?: string; wordCount?: number }) =>
      aiApi.chain(id!, params.model, params.prompt, params.wordCount),
    onSuccess: invalidate,
  });

  const compareMut = useMutation({
    mutationFn: (models: string[]) => aiApi.compare(id!, models),
    onSuccess: (data: CompareResponse) => setComparison(data),
  });

  const statusMut = useMutation({
    mutationFn: ({ pieceId, status, notes }: { pieceId: string; status: ContentStatus; notes?: string }) =>
      contentApi.updateStatus(pieceId, { status, reviewNotes: notes }),
    onSuccess: invalidate,
  });

  const updateMut = useMutation({
    mutationFn: ({ body, notes }: { body: string; notes: string }) =>
      contentApi.update(id!, { body, reviewNotes: notes || undefined }),
    onSuccess: () => invalidate(),
  });

  const deleteMut = useMutation({
    mutationFn: () => contentApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      navigate('/');
    },
  });

  const applyComparisonMut = useMutation({
    mutationFn: ({ body }: { body: string; provider: string }) =>
      contentApi.update(id!, { body }),
    onSuccess: () => {
      invalidate();
      setComparison(null);
    },
  });

  const isAiLoading =
    generateMut.isPending ||
    translateMut.isPending ||
    retranslateMut.isPending ||
    extractMut.isPending ||
    chainMut.isPending ||
    compareMut.isPending;

  const aiError =
    generateMut.error ?? translateMut.error ?? extractMut.error ?? chainMut.error ?? compareMut.error ?? null;

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!piece) return <div className="p-8 text-center">Content not found</div>;

  const availableLangs =
    piece.campaign?.targetLanguages.filter(
      (l) =>
        l !== piece.language &&
        !piece.translations?.some((t) => t.language === l),
    ) ?? [];

  const hasMetadata = !!piece.metadata;
  const hasTranslations = (piece.translations?.length ?? 0) > 0;

  const isGeneratingContent = generateMut.isPending || chainMut.isPending;
  const isExtractingMetadata = extractMut.isPending || chainMut.isPending;
  const isTranslatingContent = translateMut.isPending || chainMut.isPending;
  const pendingTranslationLangs = chainMut.isPending
    ? availableLangs
    : translateMut.isPending && translateLang
      ? [translateLang]
      : [];

  return (
    <div className="w-full">
      <Link
        to={`/campaigns/${piece.campaignId}`}
        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-sm mb-6 inline-flex items-center gap-2 font-medium"
      >
        ← Back to Campaign
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{piece.title}</h1>
            <div className="flex gap-2 mt-2 items-center text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              <span>{piece.language}</span>
              {piece.aiModel && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                  <span className="text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 rounded-full border border-purple-100 dark:border-purple-800">
                    Generated by {piece.aiModel}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteMut.isPending}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Two-column layout: sticky left panel + main content */}
      <div className="flex gap-5 items-start">

        {/* ── Left floating panel ── */}
        <aside className="w-52 shrink-0 sticky top-20 space-y-3">

          {/* AI Tools */}
          <div className="card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
              AI Tools
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setPromptModal({ action: 'generate' })}
                disabled={isAiLoading || !!piece.body}
                title={piece.body ? 'Draft already generated — use Regenerate in the Content section' : undefined}
                className="btn-primary w-full text-sm disabled:opacity-40"
              >
                {generateMut.isPending ? 'Generating…' : piece.body ? 'Draft Generated ✓' : 'Generate Draft'}
              </button>
              <button
                onClick={() => extractMut.mutate()}
                disabled={isAiLoading || !piece.body || hasMetadata}
                title={hasMetadata ? 'Metadata already extracted' : undefined}
                className="btn-secondary w-full text-sm disabled:opacity-40"
              >
                {extractMut.isPending ? 'Extracting…' : hasMetadata ? 'Metadata Extracted ✓' : 'Extract Metadata'}
              </button>
              <button
                onClick={() => setPromptModal({ action: 'chain' })}
                disabled={isAiLoading || (!!piece.body && hasMetadata)}
                title={piece.body && hasMetadata ? 'Pipeline already completed' : undefined}
                className="btn-primary w-full text-sm bg-purple-600 hover:bg-purple-700 border-none shadow-sm disabled:opacity-40"
              >
                {chainMut.isPending
                  ? 'Running…'
                  : piece.body && hasMetadata
                    ? 'Pipeline Completed ✓'
                    : 'Full Pipeline'}
              </button>
            </div>

            {availableLangs.length > 0 && (
              <div className="pt-3 mt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                <select
                  value={translateLang}
                  onChange={(e) => setTranslateLang(e.target.value)}
                  className="input-field w-full text-sm"
                >
                  <option value="">Translate to…</option>
                  {availableLangs.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <button
                  onClick={() => translateMut.mutate()}
                  disabled={isAiLoading || !translateLang || !piece.body}
                  className="btn-secondary w-full text-sm disabled:opacity-40"
                >
                  {translateMut.isPending ? 'Translating…' : 'Translate'}
                </button>
              </div>
            )}

            {aiError && (
              <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-md border border-red-200 dark:border-red-800">
                {aiError.message}
              </div>
            )}
          </div>

          {/* Compare Models */}
          {(providers?.all.length ?? 0) >= 2 && (
            <div className="card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
                Compare Models
              </p>
              <div className="space-y-1.5 mb-3">
                {providers!.all.map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compareModels.includes(p)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCompareModels((prev) => [...prev, p]);
                        } else {
                          setCompareModels((prev) => prev.filter((m) => m !== p));
                        }
                      }}
                      disabled={!providers!.available.includes(p)}
                      className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-800 focus:ring-zinc-500 disabled:opacity-40"
                    />
                    <span className={`text-sm ${providers!.available.includes(p) ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400'}`}>
                      {p}{!providers!.available.includes(p) ? ' (no key)' : ''}
                    </span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => compareMut.mutate(compareModels)}
                disabled={isAiLoading || compareModels.length < 2}
                className="btn-primary w-full text-sm disabled:opacity-40"
              >
                {compareMut.isPending ? 'Comparing…' : 'Compare'}
              </button>
              {compareMut.error && (
                <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-md border border-red-200 dark:border-red-800">
                  {compareMut.error.message}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── Main content column ── */}
        <div className="flex-1 min-w-0 space-y-4">

      {/* Content accordion */}
      <Accordion title="Content" badge={<StatusBadge status={piece.status} />} defaultOpen forceOpen={isGeneratingContent} isLoading={isGeneratingContent}>
        <ContentCard
          body={piece.body}
          status={piece.status}
          reviewNotes={piece.reviewNotes}
          isPending={statusMut.isPending}
          error={statusMut.error}
          onApprove={() => statusMut.mutate({ pieceId: id!, status: 'APPROVED' })}
          onReject={() => statusMut.mutate({ pieceId: id!, status: 'REJECTED' })}
          onReopen={() => statusMut.mutate({ pieceId: id!, status: 'DRAFT' })}
          onRegenerate={() => setPromptModal({ action: 'generate' })}
          onSave={(body, notes) => updateMut.mutate({ body, notes })}
          isGenerating={isGeneratingContent}
        />
      </Accordion>

      {/* Comparison result */}
      {comparison && (
        <ModelComparison
          comparison={comparison}
          onSelect={(provider, body) => applyComparisonMut.mutate({ body, provider })}
          selecting={applyComparisonMut.isPending}
        />
      )}

      {/* Metadata accordion */}
      <Accordion title="Metadata" defaultOpen={hasMetadata} forceOpen={isExtractingMetadata} isLoading={isExtractingMetadata}>
        {isExtractingMetadata ? (
          <div className="animate-pulse space-y-3 py-1">
            {['w-3/4', 'w-full', 'w-5/6', 'w-2/3', 'w-4/5'].map((w, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-28 flex-shrink-0" />
                <div className={`h-3 bg-zinc-200 dark:bg-zinc-700 rounded ${w}`} />
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 text-xs text-zinc-400">
              <svg className="animate-spin h-3.5 w-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Extracting metadata…
            </div>
          </div>
        ) : hasMetadata ? (
          <MetadataPanel metadata={piece.metadata as unknown as Record<string, unknown>} />
        ) : (
          <p className="text-zinc-500 text-sm">
            No metadata extracted yet. Use &ldquo;Extract Metadata&rdquo; in AI Tools.
          </p>
        )}
      </Accordion>

      {/* Translations accordion */}
      <Accordion
        title="Translations"
        badge={
          hasTranslations ? (
            <span className="bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 px-2 py-0.5 rounded-full text-[11px] font-medium">
              {piece.translations!.length}
            </span>
          ) : undefined
        }
        defaultOpen={hasTranslations}
        forceOpen={isTranslatingContent}
        isLoading={isTranslatingContent}
      >
        {hasTranslations || pendingTranslationLangs.length > 0 ? (
          <div className="space-y-4">
            {piece.translations!.map((t) => (
              <details key={t.id} open className="group border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50/60 dark:hover:bg-zinc-800/60 transition-colors select-none">
                  <div className="flex items-center gap-3">
                    <span className="bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider">
                      {t.language}
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteTranslationTarget({ id: t.id, language: t.language });
                      }}
                      disabled={deleteTranslationMut.isPending}
                      className="text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-700 px-2 py-1 rounded-md transition-colors disabled:opacity-40"
                    >
                      Delete
                    </button>
                    <svg
                      className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <ContentCard
                    body={t.body}
                    status={t.status}
                    reviewNotes={t.reviewNotes}
                    isPending={statusMut.isPending || retranslateMut.isPending}
                    error={statusMut.error ?? retranslateMut.error}
                    onApprove={() => statusMut.mutate({ pieceId: t.id, status: 'APPROVED' })}
                    onReject={() => statusMut.mutate({ pieceId: t.id, status: 'REJECTED' })}
                    onReopen={() => statusMut.mutate({ pieceId: t.id, status: 'DRAFT' })}
                    onRegenerate={() => retranslateMut.mutate(t.language)}
                    regenerateLabel="Re-translate"
                    isGenerating={retranslateMut.isPending && retranslateMut.variables === t.language}
                  />
                </div>
              </details>
            ))}
            {pendingTranslationLangs.map((lang) => (
              <div key={`pending-${lang}`} className="border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider">
                    {lang}
                  </span>
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-36" />
                  <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
                    <svg className="animate-spin h-3.5 w-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Translating…
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-full" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            No translations yet. Use the translate option in AI Tools.
          </p>
        )}
      </Accordion>

        </div>{/* end main content column */}
      </div>{/* end two-column layout */}

      {/* Delete Content Confirm */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Content"
        message={`Delete "${piece.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => { setShowDeleteConfirm(false); deleteMut.mutate(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Delete Translation Confirm */}
      <ConfirmModal
        open={!!deleteTranslationTarget}
        title="Delete Translation"
        message={`Delete ${deleteTranslationTarget?.language ?? ''} translation? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteTranslationMut.isPending}
        onConfirm={() => { if (deleteTranslationTarget) deleteTranslationMut.mutate(deleteTranslationTarget.id); setDeleteTranslationTarget(null); }}
        onCancel={() => setDeleteTranslationTarget(null)}
      />

      {/* Prompt Modal */}
      {promptModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPromptModal(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {promptModal.action === 'chain' ? 'Full Pipeline' : 'Content Generation'}
            </h2>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Provider Model</label>
              <select
                value={modalModel ?? ''}
                onChange={(e) => setModalModel(e.target.value || undefined)}
                className="input-field w-full"
              >
                <option value="">Default ({providers?.default})</option>
                {providers?.all.map((p) => (
                  <option key={p} value={p} disabled={!providers?.available.includes(p)}>
                    {p}{!providers?.available.includes(p) ? ' (no key)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Prompt</label>
              <textarea
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                placeholder="Describe the type of content you want to generate"
                rows={3}
                className="input-field w-full resize-none"
                maxLength={2000}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Approximate word count <span className="text-zinc-400 font-normal">(optional)</span></label>
              <input
                type="number"
                value={modalWordCount}
                onChange={(e) => setModalWordCount(e.target.value)}
                placeholder="e.g. 150"
                min={10}
                max={10000}
                className="input-field w-full"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setPromptModal(null); setGenerationPrompt(''); setModalWordCount(''); setModalModel(undefined); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const params = {
                    prompt: generationPrompt.trim() || undefined,
                    model: modalModel,
                    wordCount: modalWordCount ? parseInt(modalWordCount, 10) : undefined,
                  };
                  if (promptModal.action === 'chain') {
                    chainMut.mutate(params);
                  } else {
                    generateMut.mutate(params);
                  }
                  setPromptModal(null);
                  setGenerationPrompt('');
                  setModalWordCount('');
                  setModalModel(undefined);
                }}
                className="btn-primary"
              >
                {promptModal.action === 'chain' ? 'Run Pipeline' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
