import { api } from '../lib/api'
import { normalizeLanguages } from './format'
import type { ContentPiece } from '../lib/types'

export const parseLanguages = (value: string) => normalizeLanguages(value)

export const saveContent = async ({
  contentId,
  title,
  type,
  originalText,
}: {
  contentId: string
  title: string
  type: string
  originalText: string
}) =>
  api.updateContent(contentId, {
    title: title.trim(),
    type: type.trim(),
    originalText: originalText.trim(),
  })

export const generateDraft = async ({
  contentId,
  tone,
  instructions,
}: {
  contentId: string
  tone: string
  instructions: string
}) =>
  api.generateDraft(contentId, {
    tone: tone.trim() || undefined,
    instructions: instructions.trim() || undefined,
  })

export const translateContent = async ({
  contentId,
  targetLanguages,
  instructions,
}: {
  contentId: string
  targetLanguages: string[]
  instructions: string
}): Promise<ContentPiece> =>
  api.translateContent(contentId, {
    targetLanguages,
    instructions: instructions.trim() || undefined,
  })

export const deleteContent = async (contentId: string) => api.deleteContent(contentId)
