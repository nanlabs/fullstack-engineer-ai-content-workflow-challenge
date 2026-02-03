import { useEffect } from 'react'

import { ContentEvent, getSocket } from '../lib/socket'

type EventHandlers = {
  onContentCreated?: (payload: { campaignId: string; content: unknown }) => void
  onContentUpdated?: (payload: { contentId: string; content: unknown }) => void
  onContentDeleted?: (payload: { contentId: string }) => void
  onAiDraftGenerated?: (payload: { contentId: string; aiDraft: string }) => void
  onReviewStateChanged?: (payload: { contentId: string; reviewState: string }) => void
}

export function useContentEvents(handlers: EventHandlers) {
  useEffect(() => {
    const socket = getSocket()

    if (handlers.onContentCreated) {
      socket.on(ContentEvent.ContentCreated, handlers.onContentCreated)
    }
    if (handlers.onContentUpdated) {
      socket.on(ContentEvent.ContentUpdated, handlers.onContentUpdated)
    }
    if (handlers.onContentDeleted) {
      socket.on(ContentEvent.ContentDeleted, handlers.onContentDeleted)
    }
    if (handlers.onAiDraftGenerated) {
      socket.on(ContentEvent.AiDraftGenerated, handlers.onAiDraftGenerated)
    }
    if (handlers.onReviewStateChanged) {
      socket.on(ContentEvent.ReviewStateChanged, handlers.onReviewStateChanged)
    }

    return () => {
      if (handlers.onContentCreated) {
        socket.off(ContentEvent.ContentCreated, handlers.onContentCreated)
      }
      if (handlers.onContentUpdated) {
        socket.off(ContentEvent.ContentUpdated, handlers.onContentUpdated)
      }
      if (handlers.onContentDeleted) {
        socket.off(ContentEvent.ContentDeleted, handlers.onContentDeleted)
      }
      if (handlers.onAiDraftGenerated) {
        socket.off(ContentEvent.AiDraftGenerated, handlers.onAiDraftGenerated)
      }
      if (handlers.onReviewStateChanged) {
        socket.off(ContentEvent.ReviewStateChanged, handlers.onReviewStateChanged)
      }
    }
  }, [handlers])
}
