import { useState, useRef, useEffect, useCallback } from 'react';

interface Language {
  code: string;
  name: string;
}

const LANGUAGES: Language[] = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'ar', name: 'Arabic' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ca', name: 'Catalan' },
  { code: 'cs', name: 'Czech' },
  { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'et', name: 'Estonian' },
  { code: 'fa', name: 'Persian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'ga', name: 'Irish' },
  { code: 'gl', name: 'Galician' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hr', name: 'Croatian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'hy', name: 'Armenian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ka', name: 'Georgian' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ko', name: 'Korean' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ms', name: 'Malay' },
  { code: 'mt', name: 'Maltese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'no', name: 'Norwegian' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'sq', name: 'Albanian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'sw', name: 'Swahili' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tl', name: 'Filipino' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'zh-tw', name: 'Chinese (Traditional)' },
];

/** Resolve a code to its display name, falling back to the code itself. */
export function getLanguageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code.toUpperCase();
}

interface LanguagePickerProps {
  selected: string[];
  onChange: (langs: string[]) => void;
  /** Extra class applied to the outer wrapper */
  className?: string;
}

export function LanguagePicker({ selected, onChange, className = '' }: LanguagePickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = query.trim()
    ? LANGUAGES.filter(
        (l) =>
          !selected.includes(l.code) &&
          (l.code.startsWith(query.toLowerCase()) ||
            l.name.toLowerCase().includes(query.toLowerCase())),
      )
    : LANGUAGES.filter((l) => !selected.includes(l.code));

  // Reset highlight when suggestions list changes
  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addLanguage = useCallback(
    (code: string) => {
      if (!selected.includes(code)) onChange([...selected, code]);
      setQuery('');
      setOpen(false);
      inputRef.current?.focus();
    },
    [selected, onChange],
  );

  const removeLanguage = (code: string) => {
    onChange(selected.filter((l) => l !== code));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }
    if (e.key === 'Backspace' && !query && selected.length) {
      onChange(selected.slice(0, -1));
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlighted]) {
        addLanguage(suggestions[highlighted].code);
      } else if (query.trim()) {
        // Allow freeform entry for codes not in list
        const code = query.trim().toLowerCase();
        if (!selected.includes(code)) onChange([...selected, code]);
        setQuery('');
        setOpen(false);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Tag + input row */}
      <div
        className="flex flex-wrap gap-1.5 min-h-[2.25rem] px-2 py-1.5 border border-zinc-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-zinc-900 focus-within:border-transparent cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider"
          >
            {code}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => removeLanguage(code)}
              className="text-zinc-400 hover:text-red-500 transition-colors leading-none"
              aria-label={`Remove ${code}`}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.replace(/[^a-zA-Z-]/g, '').toLowerCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length ? '' : 'Search languages…'}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 py-0.5"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg py-1"
        >
          {suggestions.map((lang, i) => (
            <li key={lang.code}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addLanguage(lang.code)}
                className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                  i === highlighted ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                }`}
                onMouseEnter={() => setHighlighted(i)}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 w-10 shrink-0">
                  {lang.code}
                </span>
                <span className="text-sm text-zinc-800">{lang.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
