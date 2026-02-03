import { useEffect, useState } from 'react'

import { api } from '../lib/api'
import { normalizeLanguages } from '../lib/format'
import type { Campaign, CampaignStatus } from '../lib/types'

type UseCampaignSettingsParams = {
  initialCampaign: Campaign
  onDeleted: () => void
}

export function useCampaignSettings({ initialCampaign, onDeleted }: UseCampaignSettingsParams) {
  const [campaign, setCampaign] = useState(initialCampaign)
  const [targetLanguages, setTargetLanguages] = useState(
    normalizeLanguages(initialCampaign.targetLanguages).join(', '),
  )
  const [status, setStatus] = useState<CampaignStatus>(initialCampaign.status)
  const [campaignError, setCampaignError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setCampaign(initialCampaign)
    setTargetLanguages(normalizeLanguages(initialCampaign.targetLanguages).join(', '))
    setStatus(initialCampaign.status)
  }, [initialCampaign])

  const handleCampaignUpdate = async () => {
    setCampaignError(null)
    setIsUpdating(true)
    try {
      const updated = await api.updateCampaign(campaign.id, {
        status,
        targetLanguages: targetLanguages
          .split(',')
          .map((lang) => lang.trim())
          .filter(Boolean),
      })
      setCampaign(updated)
      setStatus(updated.status)
      setTargetLanguages(normalizeLanguages(updated.targetLanguages).join(', '))
    } catch (err) {
      setCampaignError(err instanceof Error ? err.message : 'Unable to update campaign')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteCampaign = async () => {
    if (!window.confirm('Delete this campaign and all content pieces?')) return
    try {
      await api.deleteCampaign(campaign.id)
      onDeleted()
    } catch (err) {
      setCampaignError(err instanceof Error ? err.message : 'Unable to delete campaign')
    }
  }

  return {
    campaign,
    campaignError,
    handleCampaignUpdate,
    handleDeleteCampaign,
    isUpdating,
    setStatus,
    setTargetLanguages,
    status,
    targetLanguages,
  }
}
