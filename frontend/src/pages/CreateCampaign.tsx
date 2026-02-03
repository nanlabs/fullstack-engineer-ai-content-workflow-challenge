import { useState, type SyntheticEvent } from 'react'
import { useLoaderData, useNavigate } from 'react-router-dom'

import SectionHeader from '../components/SectionHeader'
import { api } from '../lib/api'
import type { CampaignStatus } from '../lib/types'
import type { createCampaignLoader } from '../loaders'

const statusOptions: CampaignStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED']

export default function CreateCampaign() {
  const data = useLoaderData() as Awaited<ReturnType<typeof createCampaignLoader>>
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetLanguages, setTargetLanguages] = useState('en-US, es-ES')
  const [status, setStatus] = useState<CampaignStatus>('ACTIVE')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Campaign name is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        targetLanguages: targetLanguages
          .split(',')
          .map((lang) => lang.trim())
          .filter(Boolean),
      }
      const created = await api.createCampaign(payload)
      navigate(`/campaigns/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create campaign')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="space-y-8">
      <SectionHeader
        title={data.title}
        subtitle="Launch a new initiative with clear goals, target markets, and a focused content backlog."
      />

      <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Campaign name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Spring product launch"
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Status
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as CampaignStatus)}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Description
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Primary narrative, launch window, success targets."
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Target languages
          </label>
          <input
            value={targetLanguages}
            onChange={(event) => setTargetLanguages(event.target.value)}
            placeholder="en-US, fr-FR, de-DE"
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <p className="text-xs text-[var(--muted)]">Comma-separated locale codes.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating...' : 'Create campaign'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-full border border-[var(--line)] px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
