import type { CompareResponse } from '../lib/types';

interface ModelComparisonProps {
  comparison: CompareResponse;
  onSelect?: (provider: string, body: string) => void;
  selecting?: boolean;
}

export function ModelComparison({ comparison, onSelect, selecting }: ModelComparisonProps) {
  return (
    <div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Object.entries(comparison.comparisons).map(([provider, body]) => (
          <div key={provider} className="border border-zinc-200 rounded-lg p-5 bg-zinc-50/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {provider}
              </h3>
              {onSelect && (
                <button
                  onClick={() => onSelect(provider, body)}
                  disabled={selecting}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-400 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                  {selecting ? 'Applying…' : 'Use this ↗'}
                </button>
              )}
            </div>
            <p className="text-[14px] text-zinc-800 whitespace-pre-wrap font-mono leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
