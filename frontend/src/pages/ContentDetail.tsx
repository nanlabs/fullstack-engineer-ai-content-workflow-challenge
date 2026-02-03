import { useEffect, useMemo, useState } from 'react'
import { Link, useLoaderData, useNavigate } from 'react-router-dom'

import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'
import { useContentEvents } from '../hooks/useContentEvents'
import { contentTypeOptions } from '../lib/contentTypes'
import { formatDate, formatParagraphs, normalizeLanguages } from '../lib/format'
import type { ContentPiece, ContentType } from '../lib/types'
import {
  deleteContent,
  generateDraft,
  parseLanguages,
  saveContent,
  translateContent,
} from '../lib/contentActions'

const reviewTone: Record<ContentPiece['reviewState'], 'neutral' | 'accent' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  AI_SUGGESTED: 'accent',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}


export default function ContentDetail() {
  const initialContent = useLoaderData() as ContentPiece
  const navigate = useNavigate()
  const [content, setContent] = useState(initialContent)
  const [title, setTitle] = useState(initialContent.title)
  const [type, setType] = useState(initialContent.type)
  const [originalText, setOriginalText] = useState(initialContent.originalText)
  const [tone, setTone] = useState('')
  const [draftInstructions, setDraftInstructions] = useState('')
  const [targetLanguages, setTargetLanguages] = useState('')
  const [translationInstructions, setTranslationInstructions] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)

  const translationEntries = useMemo(
    () => Object.entries(content.translations ?? {}),
    [content.translations],
  )

  useEffect(() => {
    setContent(initialContent)
    setTitle(initialContent.title)
    setType(initialContent.type)
    setOriginalText(initialContent.originalText)
    setTargetLanguages(normalizeLanguages(initialContent.campaign?.targetLanguages).join(', '))
  }, [initialContent])

  useContentEvents({
    onContentUpdated: ({ contentId, content: payload }) => {
      if (contentId !== content.id) return
      setContent(payload as ContentPiece)
    },
    onAiDraftGenerated: ({ contentId, aiDraft }) => {
      if (contentId !== content.id) return
      setContent((prev) => ({ ...prev, aiDraft, reviewState: 'AI_SUGGESTED' }))
    },
    onReviewStateChanged: ({ contentId, reviewState }) => {
      if (contentId !== content.id) return
      setContent((prev) => ({ ...prev, reviewState: reviewState as ContentPiece['reviewState'] }))
    },
  })

  const handleSave = async () => {
    setError(null)
    if (!title.trim() || !originalText.trim()) {
      setError('Title and original text are required.')
      return
    }
    setIsSaving(true)
    try {
      const updated = await saveContent({
        contentId: content.id,
        title,
        type,
        originalText,
      })
      setContent(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save content')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateDraft = async () => {
    setError(null)
    setIsGenerating(true)
    try {
      const updated = await generateDraft({
        contentId: content.id,
        tone,
        instructions: draftInstructions,
      })
      setContent(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate draft')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleTranslate = async () => {
    setError(null)
    setIsTranslating(true)
    try {
      const languages = parseLanguages(targetLanguages)
      if (languages.length === 0) {
        setError('Add at least one target language to translate.')
        return
      }
      const updated = await translateContent({
        contentId: content.id,
        targetLanguages: languages,
        instructions: translationInstructions,
      })
      setContent(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to translate content')
    } finally {
      setIsTranslating(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this content piece?')) return
    try {
      await deleteContent(content.id)
      navigate(`/campaigns/${content.campaignId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete content')
    }
  }

  return (
    <section className="space-y-8">
      <SectionHeader
        title={content.title}
        subtitle="Refine the brief, generate AI drafts, and coordinate translations before review."
        action={
          <Link
            to={`/campaigns/${content.campaignId}`}
            className="rounded-full border border-[var(--line)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)]"
          >
            Back to campaign
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Review status</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <StatusBadge label={content.reviewState} tone={reviewTone[content.reviewState]} />
                  <span className="text-xs text-[var(--muted)]">Updated {formatDate(content.updatedAt)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600"
              >
                Delete
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Type</label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as ContentType)}
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
                >
                  {contentTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Original text</label>
              <textarea
                value={originalText}
                onChange={(event) => setOriginalText(event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
              />
            </div>
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save updates'}
              </button>
              <Link
                to={`/content/${content.id}/review`}
                className="rounded-full border border-[var(--line)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)]"
              >
                Review workflow
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold">AI draft</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Generate a first-pass copy draft to accelerate the review process.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Tone</label>
                <input
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  placeholder="Bold, confident, concise"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Instructions</label>
                <input
                  value={draftInstructions}
                  onChange={(event) => setDraftInstructions(event.target.value)}
                  placeholder="Highlight key benefit in opening line"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateDraft}
              disabled={isGenerating}
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? 'Generating...' : 'Generate AI draft'}
            </button>
            {content.aiDraft ? (
              <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--ink)]">
                {formatParagraphs(content.aiDraft).map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 8)}`} className="mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No AI draft generated yet.</p>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Translations</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Generate localized variations from the latest AI draft or original text.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Target languages
              </label>
              <input
                value={targetLanguages}
                onChange={(event) => setTargetLanguages(event.target.value)}
                placeholder="fr-FR, es-ES"
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Instructions
              </label>
              <textarea
                value={translationInstructions}
                onChange={(event) => setTranslationInstructions(event.target.value)}
                rows={3}
                placeholder="Keep the tone warm and premium."
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleTranslate}
              disabled={isTranslating}
              className="w-full rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isTranslating ? 'Translating...' : 'Generate translations'}
            </button>
            {translationEntries.length > 0 ? (
              <div className="space-y-3">
                {translationEntries.map(([locale, text]) => (
                  <div key={locale} className="rounded-2xl border border-[var(--line)] bg-white/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{locale}</p>
                    <p className="mt-2 text-sm text-[var(--ink)]">{text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No translations generated yet.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
