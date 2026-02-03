import { useEffect, useState } from 'react'
import { Link, useLoaderData } from 'react-router-dom'
import { toast } from 'sonner'

import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'
import Tooltip from '../components/Tooltip'
import { useContentEvents } from '../hooks/useContentEvents'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import type { ContentPiece, ReviewDecision } from '../lib/types'

const reviewTone: Record<ContentPiece['reviewState'], 'neutral' | 'accent' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  AI_SUGGESTED: 'accent',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

export default function ContentReview() {
  const initialContent = useLoaderData() as ContentPiece
  const [content, setContent] = useState(initialContent)
  const [editedDraft, setEditedDraft] = useState(initialContent.aiDraft ?? initialContent.originalText)
  const [hasEdited, setHasEdited] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setContent(initialContent)
    setEditedDraft(initialContent.aiDraft ?? initialContent.originalText)
    setHasEdited(false)
  }, [initialContent])

  useEffect(() => {
    if (!hasEdited) {
      setEditedDraft(content.aiDraft ?? content.originalText)
    }
  }, [content.aiDraft, content.originalText, hasEdited])

  useContentEvents({
    onContentUpdated: ({ contentId, content: payload }) => {
      if (contentId !== content.id) return
      setContent(payload as ContentPiece)
    },
    onReviewStateChanged: ({ contentId, reviewState }) => {
      if (contentId !== content.id) return
      setContent((prev) => ({ ...prev, reviewState: reviewState as ContentPiece['reviewState'] }))
    },
  })

  const handleReview = async (decision: ReviewDecision) => {
    setError(null)
    if (decision === 'EDIT' && !editedDraft.trim()) {
      setError('Edited draft is required before saving.')
      toast.error('Add edits before saving.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        decision,
        editedText: decision === 'EDIT' ? editedDraft : undefined,
        feedback: feedback.trim() || undefined,
      }
      const updated = await api.submitReview(content.id, payload)
      setContent(updated)
      if (decision === 'APPROVE') {
        toast.success('Content approved.')
      } else if (decision === 'REJECT') {
        toast.success('Content rejected.')
      } else {
        toast.success('Edits saved.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit review'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isApproveDisabled = content.reviewState === 'APPROVED'
  const isRejectDisabled = content.reviewState === 'REJECTED'
  const approveButton = (
    <button
      type="button"
      onClick={() => {
        if (isSubmitting || isApproveDisabled) return
        handleReview('APPROVE')
      }}
      aria-disabled={isSubmitting || isApproveDisabled}
      disabled={isSubmitting}
      data-disabled={isSubmitting || isApproveDisabled}
      className={`rounded-full bg-emerald-600 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition ${
        isSubmitting || isApproveDisabled ? 'cursor-not-allowed opacity-60' : ''
      }`}
    >
      Approve
    </button>
  )
  const rejectButton = (
    <button
      type="button"
      onClick={() => {
        if (isSubmitting || isRejectDisabled) return
        handleReview('REJECT')
      }}
      aria-disabled={isSubmitting || isRejectDisabled}
      disabled={isSubmitting}
      data-disabled={isSubmitting || isRejectDisabled}
      className={`rounded-full border border-rose-200 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition ${
        isSubmitting || isRejectDisabled ? 'cursor-not-allowed opacity-60' : ''
      }`}
    >
      Reject
    </button>
  )

  return (
    <section className="space-y-8">
      <SectionHeader
        title="Review workflow"
        subtitle="Compare the AI draft to the original brief, adjust copy, and finalize the decision."
        action={
          <Link
            to={`/content/${content.id}`}
            className="rounded-full border border-[var(--line)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)]"
          >
            Back to content
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Current state</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <StatusBadge label={content.reviewState} tone={reviewTone[content.reviewState]} />
                  <span className="text-xs text-[var(--muted)]">Updated {formatDate(content.updatedAt)}</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold">{content.title}</h3>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold">Original brief</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">Reference text supplied by the campaign team.</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--ink)]">
              {content.originalText}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold">AI draft</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">Edit the copy before sending your decision.</p>
            </div>
            <textarea
              value={editedDraft}
              onChange={(event) => {
                setEditedDraft(event.target.value)
                setHasEdited(true)
              }}
              rows={8}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm"
            />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Feedback (optional)</label>
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm"
              />
            </div>
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {isApproveDisabled ? <Tooltip label="Already approved">{approveButton}</Tooltip> : approveButton}
              {isRejectDisabled ? <Tooltip label="Already rejected">{rejectButton}</Tooltip> : rejectButton}
              <button
                type="button"
                onClick={() => handleReview('EDIT')}
                disabled={isSubmitting}
                className="rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Edit & save
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Review timeline</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                The latest review metadata is captured after decisions are submitted.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Last updated</p>
              <p className="mt-2 text-sm text-[var(--ink)]">{formatDate(content.updatedAt)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Latest feedback</p>
              <p className="mt-2 text-sm text-[var(--ink)]">
                {content.metadata?.reviewFeedback || 'No feedback submitted yet.'}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {content.metadata?.reviewedAt ? `Reviewed ${formatDate(content.metadata.reviewedAt)}` : 'Awaiting review activity.'}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
