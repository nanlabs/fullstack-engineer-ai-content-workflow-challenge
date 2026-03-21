interface MetadataPanelProps {
  metadata: Record<string, unknown>;
}

export function MetadataPanel({ metadata }: MetadataPanelProps) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <span className="text-zinc-500 font-medium">Tone</span>
          <p className="font-semibold text-zinc-900 capitalize mt-1">{metadata.tone as string}</p>
        </div>
        <div>
          <span className="text-zinc-500 font-medium">Sentiment</span>
          <p className="font-semibold text-zinc-900 capitalize mt-1">{metadata.sentiment as string}</p>
        </div>
        <div>
          <span className="text-zinc-500 font-medium">Readability</span>
          <p className="font-semibold text-zinc-900 capitalize mt-1">{metadata.readability as string}</p>
        </div>
        <div>
          <span className="text-zinc-500 font-medium">Keywords</span>
          <div className="flex flex-wrap gap-1 mt-2">
            {((metadata.keywords as string[]) ?? []).map((kw) => (
              <span
                key={kw}
                className="bg-zinc-100/80 text-zinc-600 px-2 py-0.5 rounded text-[11px] font-medium border border-zinc-200 tracking-wide"
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
