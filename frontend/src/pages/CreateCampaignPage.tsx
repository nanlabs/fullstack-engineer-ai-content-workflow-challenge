import { useState } from 'react'
import { CreateCampaignForm } from '../components/campaign/CreateCampaignForm'
import { createCampaign } from '../services/campaign.service'
import type { CreateCampaignPayload } from '../types/campaign'
import './CreateCampaignPage.css'

export function CreateCampaignPage() {
  const [loading, setLoading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  async function handleCreateCampaign(payload: CreateCampaignPayload) {
    setRequestError(null)
    setCreatedId(null)
    setLoading(true)

    try {
      const createdCampaign = await createCampaign(payload)
      setCreatedId(createdCampaign.id)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="create-campaign-page">
      <section className="create-campaign-page__card">
        <h1>Create Content Workflow</h1>
        <p className="create-campaign-page__subtitle">
          Enter topic, model and languages to create a campaign.
        </p>

        <CreateCampaignForm onSubmitCampaign={handleCreateCampaign} loading={loading} />

        {requestError && <p className="create-campaign-page__error">{requestError}</p>}

        {createdId && (
          <div className="create-campaign-page__success">
            <p>
              Campaign created successfully. ID: <code>{createdId}</code>
            </p>
            <a className="create-campaign-page__details-link" href={`/campaigns/${createdId}`}>
              View campaign details
            </a>
          </div>
        )}
      </section>
    </main>
  )
}
