import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import type { ContentPiece } from '../lib/types';

interface TranslationsListProps {
  translations: ContentPiece[];
}

export function TranslationsList({ translations }: TranslationsListProps) {
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Translations</h2>
      <div className="space-y-3">
        {translations.map((t) => (
          <Link
            key={t.id}
            to={`/content/${t.id}`}
            className="block border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 hover:shadow-sm transition-all bg-white group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider">
                  {t.language}
                </span>
                <span className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">{t.title}</span>
              </div>
              <StatusBadge status={t.status} />
            </div>
            {t.body && (
              <p className="text-sm text-zinc-500 mt-3 line-clamp-2 leading-relaxed">{t.body}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
