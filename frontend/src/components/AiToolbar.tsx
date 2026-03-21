interface AiToolbarProps {
  selectedModel: string | undefined;
  onModelChange: (model: string | undefined) => void;
  providers: { default: string; available: string[] } | undefined;
  hasBody: boolean;
  availableLangs: string[];
  translateLang: string;
  onTranslateLangChange: (lang: string) => void;
  isAiLoading: boolean;
  onGenerate: () => void;
  onExtract: () => void;
  onChain: () => void;
  onCompare: () => void;
  onTranslate: () => void;
  generating: boolean;
  extracting: boolean;
  chaining: boolean;
  comparing: boolean;
  translating: boolean;
  error: Error | null;
}

export function AiToolbar({
  selectedModel,
  onModelChange,
  providers,
  hasBody,
  availableLangs,
  translateLang,
  onTranslateLangChange,
  isAiLoading,
  onGenerate,
  onExtract,
  onChain,
  onCompare,
  onTranslate,
  generating,
  extracting,
  chaining,
  comparing,
  translating,
  error,
}: AiToolbarProps) {
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">AI Tools</h2>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-zinc-700">Provider Model:</label>
        <select
          value={selectedModel ?? ''}
          onChange={(e) => onModelChange(e.target.value || undefined)}
          className="input-field max-w-[200px]"
        >
          <option value="">Default ({providers?.default})</option>
          {providers?.available.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onGenerate}
          disabled={isAiLoading}
          className="btn-primary"
        >
          {generating ? 'Generating...' : 'Generate Draft'}
        </button>
        <button
          onClick={onExtract}
          disabled={isAiLoading || !hasBody}
          className="btn-secondary"
        >
          {extracting ? 'Extracting...' : 'Extract Metadata'}
        </button>
        <button
          onClick={onChain}
          disabled={isAiLoading}
          className="btn-primary bg-purple-600 hover:bg-purple-700 border-none shadow-sm"
        >
          {chaining
            ? 'Running pipeline...'
            : 'Full Pipeline (Gen → Trans → Extract)'}
        </button>
        <button
          onClick={onCompare}
          disabled={isAiLoading || (providers?.available.length ?? 0) < 2}
          className="btn-secondary"
          title={
            (providers?.available.length ?? 0) < 2
              ? 'Need 2+ providers for comparison'
              : undefined
          }
        >
          {comparing ? 'Comparing...' : 'Compare Models'}
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
