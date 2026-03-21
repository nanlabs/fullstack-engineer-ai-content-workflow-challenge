interface AiToolbarProps {
  selectedModel: string | undefined;
  onModelChange: (model: string | undefined) => void;
  providers: { all: string[]; default: string; available: string[] } | undefined;
  hasBody: boolean;
  hasMetadata: boolean;
  availableLangs: string[];
  translateLang: string;
  onTranslateLangChange: (lang: string) => void;
  isAiLoading: boolean;
  onGenerate: () => void;
  onExtract: () => void;
  onChain: () => void;
  onTranslate: () => void;
  generating: boolean;
  extracting: boolean;
  chaining: boolean;
  translating: boolean;
  error: Error | null;
}

export function AiToolbar({
  selectedModel,
  onModelChange,
  providers,
  hasBody,
  hasMetadata,
  availableLangs,
  translateLang,
  onTranslateLangChange,
  isAiLoading,
  onGenerate,
  onExtract,
  onChain,
  onTranslate,
  generating,
  extracting,
  chaining,
  translating,
  error,
}: AiToolbarProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-zinc-700">Provider Model:</label>
        <select
          value={selectedModel ?? ''}
          onChange={(e) => onModelChange(e.target.value || undefined)}
          className="input-field max-w-[200px]"
        >
          <option value="">Default ({providers?.default})</option>
          {providers?.all.map((p) => (
            <option key={p} value={p} disabled={!providers?.available.includes(p)}>
              {p}{!providers?.available.includes(p) ? ' (no key)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onGenerate}
          disabled={isAiLoading || hasBody}
          className="btn-primary disabled:opacity-40"
          title={hasBody ? 'Draft already generated — use Regenerate in the Content section' : undefined}
        >
          {generating ? 'Generating...' : hasBody ? 'Draft Generated ✓' : 'Generate Draft'}
        </button>
        <button
          onClick={onExtract}
          disabled={isAiLoading || !hasBody || hasMetadata}
          className="btn-secondary disabled:opacity-40"
          title={hasMetadata ? 'Metadata already extracted — regenerate from the Metadata section' : undefined}
        >
          {extracting ? 'Extracting...' : hasMetadata ? 'Metadata Extracted ✓' : 'Extract Metadata'}
        </button>
        <button
          onClick={onChain}
          disabled={isAiLoading || (hasBody && hasMetadata)}
          className="btn-primary bg-purple-600 hover:bg-purple-700 border-none shadow-sm disabled:opacity-40"
          title={hasBody && hasMetadata ? 'Pipeline already completed' : undefined}
        >
          {chaining
            ? 'Running pipeline...'
            : hasBody && hasMetadata
              ? 'Pipeline Completed ✓'
              : 'Full Pipeline (Gen → Trans → Extract)'}
        </button>
      </div>

      {availableLangs.length > 0 && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-200/60">
          <select
            value={translateLang}
            onChange={(e) => onTranslateLangChange(e.target.value)}
            className="input-field max-w-[200px]"
          >
            <option value="">Translate to...</option>
            {availableLangs.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={onTranslate}
            disabled={isAiLoading || !translateLang || !hasBody}
            className="btn-secondary"
          >
            {translating ? 'Translating...' : 'Translate'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error.message}
        </div>
      )}
    </div>
  );
}

export type { AiToolbarProps };
