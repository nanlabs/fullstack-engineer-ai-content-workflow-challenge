import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi, aiApi } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Accordion } from '../components/Accordion';
import { ContentCard } from '../components/ContentCard';
import { AiToolbar } from '../components/AiToolbar';
import { ModelComparison } from '../components/ModelComparison';
import { MetadataPanel } from '../components/MetadataPanel';
import type { ContentStatus, CompareResponse } from '../lib/types';

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [translateLang, setTranslateLang] = useState('');
  const [compareModels, setCompareModels] = useState<string[]>([]);

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
    mutationFn: () => aiApi.generate(id!, selectedModel),
    onSuccess: invalidate,
  });

  const translateMut = useMutation({
    mutationFn: () => aiApi.translate(id!, translateLang, selectedModel),
    onSuccess: () => {
      invalidate();
      setTranslateLang('');
    },
  });

  const extractMut = useMutation({
    mutationFn: () => aiApi.extract(id!, selectedModel),
    onSuccess: invalidate,
  });

  const chainMut = useMutation({
    mutationFn: () => aiApi.chain(id!, selectedModel),
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

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link
        to={`/campaigns/${piece.campaignId}`}
        className="text-zinc-500 hover:text-zinc-900 transition-colors text-sm mb-8 inline-flex items-center gap-2 font-medium"
      >
        ← Back to Campaign
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{piece.title}</h1>
            <div className="flex gap-2 mt-2 items-center text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              <span>{piece.type.replace('_', ' ')}</span>
              <span className="text-zinc-300">•</span>
              <span>{piece.language}</span>
              {piece.aiModel && (
                <>
                  <span className="text-zinc-300">•</span>
                  <span className="text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                    Generated by {piece.aiModel}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={piece.status} />
            <button
              onClick={() => {
                if (window.confirm(`Delete "${piece.title}"? This cannot be undone.`)) {
                  deleteMut.mutate();
                }
              }}
              disabled={deleteMut.isPending}
              className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Content accordion */}
      <Accordion title="Content" badge={<StatusBadge status={piece.status} />} defaultOpen>
        <ContentCard
          body={piece.body}
          status={piece.status}
          reviewNotes={piece.reviewNotes}
          isPending={statusMut.isPending}
          error={statusMut.error}
          onApprove={() => statusMut.mutate({ pieceId: id!, status: 'APPROVED' })}
          onReject={() => statusMut.mutate({ pieceId: id!, status: 'REJECTED' })}
          onReopen={() => statusMut.mutate({ pieceId: id!, status: 'DRAFT' })}
          onRegenerate={() => generateMut.mutate()}
          onSave={(body, notes) => updateMut.mutate({ body, notes })}
        />
      </Accordion>

      {/* AI Tools accordion */}
      <Accordion title="AI Tools" defaultOpen={piece.status === 'DRAFT'}>
        <AiToolbar
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          providers={providers}
          hasBody={!!piece.body}
          hasMetadata={hasMetadata}
          availableLangs={availableLangs}
          translateLang={translateLang}
          onTranslateLangChange={setTranslateLang}
          isAiLoading={isAiLoading}
          onGenerate={() => generateMut.mutate()}
          onExtract={() => extractMut.mutate()}
          onChain={() => chainMut.mutate()}
          onTranslate={() => translateMut.mutate()}
          generating={generateMut.isPending}
          extracting={extractMut.isPending}
          chaining={chainMut.isPending}
          translating={translateMut.isPending}
          error={aiError}
        />
      </Accordion>

      {/* Compare Models accordion */}
      {(providers?.all.length ?? 0) >= 2 && (
        <Accordion title="Compare Models">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {providers!.all.map((p) => (
                <label key={p} className="inline-flex items-center gap-1.5 cursor-pointer">
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
                    className="rounded border-zinc-300 text-zinc-800 focus:ring-zinc-500 disabled:opacity-40"
                  />
                  <span className={`text-sm ${providers!.available.includes(p) ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    {p}{!providers!.available.includes(p) ? ' (no key)' : ''}
                  </span>
                </label>
              ))}
            </div>
            <button
              onClick={() => compareMut.mutate(compareModels)}
              disabled={isAiLoading || compareModels.length < 2}
              className="btn-primary disabled:opacity-40"
            >
              {compareMut.isPending ? 'Comparing...' : `Run Comparison (${compareModels.length} models)`}
            </button>
            {compareMut.error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {compareMut.error.message}
              </div>
            )}
            {comparison && (
              <ModelComparison
                comparison={comparison}
                onSelect={(provider, body) => applyComparisonMut.mutate({ body, provider })}
                selecting={applyComparisonMut.isPending}
              />
            )}
          </div>
        </Accordion>
      )}

      {/* Metadata accordion */}
      <Accordion title="Metadata" defaultOpen={hasMetadata}>
        {hasMetadata ? (
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
            <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
              {piece.translations!.length}
            </span>
          ) : undefined
        }
        defaultOpen={hasTranslations}
      >
        {hasTranslations ? (
          <div className="space-y-4">
            {piece.translations!.map((t) => (
              <details key={t.id} className="group border border-zinc-200 rounded-lg overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50/60 transition-colors select-none">
                  <div className="flex items-center gap-3">
                    <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider">
                      {t.language}
                    </span>
                    <span className="font-semibold text-zinc-900 text-sm">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
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
                <div className="px-4 pb-4 pt-2 border-t border-zinc-100">
                  <ContentCard
                    body={t.body}
                    status={t.status}
                    reviewNotes={t.reviewNotes}
                    isPending={statusMut.isPending}
                    error={statusMut.error}
                    onApprove={() => statusMut.mutate({ pieceId: t.id, status: 'APPROVED' })}
                    onReject={() => statusMut.mutate({ pieceId: t.id, status: 'REJECTED' })}
                    onReopen={() => statusMut.mutate({ pieceId: t.id, status: 'DRAFT' })}
                    regenerateLabel="Re-translate"
                  />
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            No translations yet. Use the translate option in AI Tools.
          </p>
        )}
      </Accordion>
    </div>
  );
}
