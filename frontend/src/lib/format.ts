export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatLanguages(languages?: string[] | string | null): string {
  if (!languages) return 'No target languages'
  if (Array.isArray(languages)) {
    if (languages.length === 0) return 'No target languages'
    return languages.join(', ')
  }
  if (typeof languages === 'string') {
    const cleaned = languages
      .split(',')
      .map((lang) => lang.trim())
      .filter(Boolean)
    return cleaned.length ? cleaned.join(', ') : 'No target languages'
  }
  return 'No target languages'
}

export function normalizeLanguages(languages?: string[] | string | null): string[] {
  if (!languages) return []
  if (Array.isArray(languages)) return languages
  if (typeof languages === 'string') {
    return languages
      .split(',')
      .map((lang) => lang.trim())
      .filter(Boolean)
  }
  return []
}

export function formatParagraphs(text?: string | null): string[] {
  if (!text) return []
  return text.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean)
}
