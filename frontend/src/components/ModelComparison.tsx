import type { CompareResponse } from '../lib/types';

interface ModelComparisonProps {
  comparison: CompareResponse;
}

export function ModelComparison({ comparison }: ModelComparisonProps) {
  return (
    <div className="bg-white rounded-lg shadow p-5 mb-4">
      <h2 className="font-semibold mb-3">Model Comparison</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(comparison.comparisons).map(([provider, body]) => (
          <div key={provider} className="border rounded p-3">
            <h3 className="text-sm font-medium text-purple-600 mb-2">
              {provider}
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
