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
    <div className="bg-white rounded-lg shadow p-5 mb-4">
      <h2 className="font-semibold mb-3">AI Tools</h2>
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm text-gray-500">Model:</label>
        <select
          value={selectedModel ?? ''}
          onChange={(e) => onModelChange(e.target.value || undefined)}
          className="border rounded px-2 py-1 text-sm"
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
          className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Draft'}
        </button>
        <button
          onClick={onExtract}
          disabled={isAiLoading || !hasBody}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {extracting ? 'Extracting...' : 'Extract Metadata'}
        </button>
        <button
          onClick={onChain}
          disabled={isAiLoading}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
        >
          {chaining
            ? 'Running pipeline...'
            : 'Full Pipeline (Generate → Translate → Extract)'}
        </button>
        <button
          onClick={onCompare}
          disabled={isAiLoading || (providers?.available.length ?? 0) < 2}
          className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm hover:bg-amber-700 disabled:opacity-50"
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
        <div className="flex items-center gap-2 mt-3">
          <select
            value={translateLang}
            onChange={(e) => onTranslateLangChange(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
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
            className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm hover:bg-teal-700 disabled:opacity-50"
          >
            {translating ? 'Translating...' : 'Translate'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mt-2">{error.message}</p>
      )}
    </div>
  );
}
