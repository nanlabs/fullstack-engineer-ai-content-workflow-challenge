import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'

import { api } from '../lib/api'
import type { ContentPiece } from '../lib/types'
import { useContentEvents } from './useContentEvents'

type UseCampaignContentParams = {
  campaignId: string
  initialContentPieces: ContentPiece[]
}

export function useCampaignContent({ campaignId, initialContentPieces }: UseCampaignContentParams) {
  const [contentPieces, setContentPieces] = useState<ContentPiece[]>(initialContentPieces)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Email')
  const [originalText, setOriginalText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  useEffect(() => {
    setContentPieces(initialContentPieces)
  }, [initialContentPieces])

  useContentEvents({
    onContentCreated: ({ campaignId: incomingCampaignId, content }) => {
      if (incomingCampaignId !== campaignId) return
      setContentPieces((prev) => {
        const created = content as ContentPiece
        return prev.some((item) => item.id === created.id) ? prev : [created, ...prev]
      })
    },
    onContentUpdated: ({ contentId, content }) => {
      setContentPieces((prev) =>
        prev.map((item) => (item.id === contentId ? (content as ContentPiece) : item)),
      )
    },
    onContentDeleted: ({ contentId }) => {
      setContentPieces((prev) => prev.filter((item) => item.id !== contentId))
    },
    onAiDraftGenerated: ({ contentId, aiDraft }) => {
      setContentPieces((prev) =>
        prev.map((item) =>
          item.id === contentId
            ? {
                ...item,
                aiDraft,
                reviewState: 'AI_SUGGESTED',
              }
            : item,
        ),
      )
    },
    onReviewStateChanged: ({ contentId, reviewState }) => {
      setContentPieces((prev) =>
        prev.map((item) =>
          item.id === contentId ? { ...item, reviewState: reviewState as ContentPiece['reviewState'] } : item,
        ),
      )
    },
  })

  const handleCreateContent = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!title.trim() || !originalText.trim()) {
      setError('Title and original text are required.')
      return
    }

    setIsCreating(true)
    try {
      const created = await api.createContent(campaignId, {
        title: title.trim(),
        type: type.trim() || 'Content',
        originalText: originalText.trim(),
      })
      setContentPieces((prev) => [created, ...prev])
      setTitle('')
      setType('Email')
      setOriginalText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add content piece')
    } finally {
      setIsCreating(false)
    }
  }

  const handleGenerateDraft = async (contentId: string) => {
    setError(null)
    setGeneratingId(contentId)
    try {
      const updated = await api.generateDraft(contentId, {})
      setContentPieces((prev) => prev.map((item) => (item.id === contentId ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate AI draft')
    } finally {
      setGeneratingId(null)
    }
  }

  const handleDeleteContent = async (contentId: string) => {
    setError(null)
    if (!window.confirm('Delete this content piece?')) return
    try {
      await api.deleteContent(contentId)
      setContentPieces((prev) => prev.filter((item) => item.id !== contentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete content piece')
    }
  }

  const sortedContent = useMemo(
    () => [...contentPieces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [contentPieces],
  )

  return {
    contentError: error,
    generatingId,
    handleCreateContent,
    handleDeleteContent,
    handleGenerateDraft,
    isCreating,
    originalText,
    setOriginalText,
    setTitle,
    setType,
    sortedContent,
    title,
    type,
  }
}
