import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { CampaignProvider, CreateCampaignPayload } from '../../types/campaign'
import './CreateCampaignForm.css'

type CreateCampaignFormProps = {
  onSubmitCampaign: (payload: CreateCampaignPayload) => Promise<void>
  loading: boolean
}

export function CreateCampaignForm({ onSubmitCampaign, loading }: CreateCampaignFormProps) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [provider, setProvider] = useState<CampaignProvider>('openai')
  const [model, setModel] = useState('gpt-4o-mini')
  const [languagesInput, setLanguagesInput] = useState('es,en')
  const [validationError, setValidationError] = useState<string | null>(null)

  const languages = useMemo(
    () =>
      languagesInput
        .split(',')
        .map((lang) => lang.trim())
        .filter(Boolean),
    [languagesInput],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    if (!topic.trim()) {
      setValidationError('Topic is required.')
      return
    }

    if (!model.trim()) {
      setValidationError('Model is required.')
      return
    }

    if (languages.length === 0) {
      setValidationError('Add at least one language.')
      return
    }

    await onSubmitCampaign({
      topic: topic.trim(),
      description: description.trim() || undefined,
      provider,
      model: model.trim(),
      languages,
    })

    setTopic('')
    setDescription('')
  }

  return (
    <form className="campaign-form" onSubmit={handleSubmit}>
      <label>
        Topic
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Vacunacion infantil para familias"
          required
        />
      </label>

      <label>
        Description (optional)
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Context for this campaign"
        />
      </label>

      <div className="campaign-form__row">
        <label>
          Provider
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as CampaignProvider)}
          >
            <option value="openai">openai</option>
            <option value="anthropic">anthropic</option>
          </select>
        </label>

        <label>
          Model
          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="gpt-4o-mini"
            required
          />
        </label>
      </div>

      <label>
        Languages (comma separated)
        <input
          value={languagesInput}
          onChange={(event) => setLanguagesInput(event.target.value)}
          placeholder="es,en"
          required
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create campaign'}
      </button>

      {validationError && <p className="campaign-form__error">{validationError}</p>}
    </form>
  )
}
