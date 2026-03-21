import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import type { ContentPiece } from '../lib/types';

interface TranslationsListProps {
  translations: ContentPiece[];
}

export function TranslationsList({ translations }: TranslationsListProps) {
  return (
    <div className="bg-white rounded-lg shadow p-5 mb-4">
      <h2 className="font-semibold mb-3">Translations</h2>
      <div className="space-y-3">
        {translations.map((t) => (
          <Link
            key={t.id}
            to={`/content/${t.id}`}
            className="block border rounded p-3 hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs mr-2">
                  {t.language}
                </span>
                <span className="font-medium text-sm">{t.title}</span>
              </div>
              <StatusBadge status={t.status} />
            </div>
            {t.body && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.body}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
