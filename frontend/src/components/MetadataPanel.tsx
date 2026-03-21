interface MetadataPanelProps {
  metadata: Record<string, unknown>;
}

export function MetadataPanel({ metadata }: MetadataPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow p-5 mb-4">
      <h2 className="font-semibold mb-3">Metadata</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Tone:</span>
          <p className="font-medium capitalize">{metadata.tone as string}</p>
        </div>
        <div>
          <span className="text-gray-500">Sentiment:</span>
          <p className="font-medium capitalize">{metadata.sentiment as string}</p>
        </div>
        <div>
          <span className="text-gray-500">Readability:</span>
          <p className="font-medium capitalize">{metadata.readability as string}</p>
        </div>
        <div>
          <span className="text-gray-500">Keywords:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {((metadata.keywords as string[]) ?? []).map((kw) => (
              <span
                key={kw}
                className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
