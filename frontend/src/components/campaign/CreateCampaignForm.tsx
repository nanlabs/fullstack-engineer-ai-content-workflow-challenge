import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getProviderModels } from '../../services/campaign.service'
import type {
  CampaignProvider,
  CreateCampaignPayload,
  ProviderModelOption,
} from '../../types/campaign'
import './CreateCampaignForm.css'

type CreateCampaignFormProps = {
  onSubmitCampaign: (payload: CreateCampaignPayload) => Promise<void>
  loading: boolean
}

const COMMON_LOCALES = [
  { code: 'en-US', label: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)' },
  { code: 'en-CA', label: 'English (Canada)' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'es-MX', label: 'Spanish (Mexico)' },
  { code: 'es-AR', label: 'Spanish (Argentina)' },
  { code: 'fr-FR', label: 'French (France)' },
  { code: 'fr-CA', label: 'French (Canada)' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)' },
  { code: 'de-DE', label: 'German (Germany)' },
  { code: 'it-IT', label: 'Italian (Italy)' },
  { code: 'ja-JP', label: 'Japanese (Japan)' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' },
  { code: 'ko-KR', label: 'Korean (South Korea)' },
  { code: 'nl-NL', label: 'Dutch (Netherlands)' },
  { code: 'sv-SE', label: 'Swedish (Sweden)' },
  { code: 'no-NO', label: 'Norwegian (Norway)' },
  { code: 'da-DK', label: 'Danish (Denmark)' },
  { code: 'fi-FI', label: 'Finnish (Finland)' },
  { code: 'pl-PL', label: 'Polish (Poland)' },
  { code: 'cs-CZ', label: 'Czech (Czechia)' },
  { code: 'tr-TR', label: 'Turkish (Turkey)' },
  { code: 'ru-RU', label: 'Russian (Russia)' },
  { code: 'uk-UA', label: 'Ukrainian (Ukraine)' },
  { code: 'ar-SA', label: 'Arabic (Saudi Arabia)' },
  { code: 'he-IL', label: 'Hebrew (Israel)' },
  { code: 'hi-IN', label: 'Hindi (India)' },
  { code: 'th-TH', label: 'Thai (Thailand)' },
  { code: 'vi-VN', label: 'Vietnamese (Vietnam)' },
  { code: 'id-ID', label: 'Indonesian (Indonesia)' },
  { code: 'ms-MY', label: 'Malay (Malaysia)' },
  { code: 'ro-RO', label: 'Romanian (Romania)' },
  { code: 'el-GR', label: 'Greek (Greece)' },
  { code: 'hu-HU', label: 'Hungarian (Hungary)' },
] as const

export function CreateCampaignForm({ onSubmitCampaign, loading }: CreateCampaignFormProps) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [provider, setProvider] = useState<CampaignProvider>('openai')
  const [model, setModel] = useState('')
  const [modelOptions, setModelOptions] = useState<ProviderModelOption[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [selectedLocales, setSelectedLocales] = useState<string[]>(['es-ES', 'en-US'])
  const [localeSearch, setLocaleSearch] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const visibleLocales = COMMON_LOCALES.filter((locale) => {
    const term = localeSearch.trim().toLowerCase()
    if (!term) {
      return true
    }
    return (
      locale.label.toLowerCase().includes(term) || locale.code.toLowerCase().includes(term)
    )
  })

  function toggleLocale(localeCode: string) {
    setSelectedLocales((current) =>
      current.includes(localeCode)
        ? current.filter((locale) => locale !== localeCode)
        : [...current, localeCode],
    )
  }

  useEffect(() => {
    async function loadModels() {
      setModelsLoading(true)
      setModelsError(null)
      try {
        const models = await getProviderModels(provider)
        setModelOptions(models)
        setModel((currentModel) => {
          if (models.some((item) => item.id === currentModel)) {
            return currentModel
          }
          return models[0]?.id ?? ''
        })
      } catch (error) {
        setModelOptions([])
        setModel('')
        setModelsError(error instanceof Error ? error.message : 'Failed to load models')
      } finally {
        setModelsLoading(false)
      }
    }

    void loadModels()
  }, [provider])

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

    if (selectedLocales.length === 0) {
      setValidationError('Select at least one localization.')
      return
    }

    await onSubmitCampaign({
      topic: topic.trim(),
      description: description.trim() || undefined,
      provider,
      model: model.trim(),
      languages: selectedLocales,
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
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            disabled={modelsLoading || modelOptions.length === 0}
            required
          >
            {modelsLoading ? <option value="">Loading models...</option> : null}
            {!modelsLoading && modelOptions.length === 0 ? (
              <option value="">No models available</option>
            ) : null}
            {!modelsLoading
              ? modelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))
              : null}
          </select>
          {modelsError ? <small className="campaign-form__model-error">{modelsError}</small> : null}
        </label>
      </div>

      <fieldset className="campaign-form__locales">
        <legend>Localizations</legend>
        <input
          className="campaign-form__locale-search"
          value={localeSearch}
          onChange={(event) => setLocaleSearch(event.target.value)}
          placeholder="Search locale"
        />
        <div className="campaign-form__locale-grid">
          {visibleLocales.map((locale) => (
            <label key={locale.code} className="campaign-form__locale-option">
              <input
                type="checkbox"
                checked={selectedLocales.includes(locale.code)}
                onChange={() => toggleLocale(locale.code)}
              />
              <span>
                {locale.label}
                <small>{locale.code}</small>
              </span>
            </label>
          ))}
        </div>
        {visibleLocales.length === 0 ? (
          <p className="campaign-form__locale-empty">No locale found for that search.</p>
        ) : null}

        {selectedLocales.length > 0 ? (
          <div className="campaign-form__selected-locales">
            {selectedLocales.map((locale) => (
              <span key={locale}>{locale}</span>
            ))}
          </div>
        ) : null}
      </fieldset>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create campaign'}
      </button>

      {validationError && <p className="campaign-form__error">{validationError}</p>}
    </form>
  )
}
