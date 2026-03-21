import type { CompareResponse } from '../lib/types';

interface ModelComparisonProps {
  comparison: CompareResponse;
}

export function ModelComparison({ comparison }: ModelComparisonProps) {
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Model Comparison</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Object.entries(comparison.comparisons).map(([provider, body]) => (
          <div key={provider} className="border border-zinc-200 rounded-lg p-5 bg-zinc-50/50">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              {provider}
            </h3>
            <p className="text-[14px] text-zinc-800 whitespace-pre-wrap font-mono leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
