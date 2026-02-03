import { Link } from 'react-router-dom'

import { formatDate, formatLanguages } from '../lib/format'
import type { Campaign } from '../lib/types'
import StatusBadge from './StatusBadge'

const statusTone: Record<Campaign['status'], 'accent' | 'warning' | 'neutral'> = {
  ACTIVE: 'accent',
  PAUSED: 'warning',
  ARCHIVED: 'neutral',
}

export default function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="group block h-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-soft transition hover:-translate-y-1 hover:border-[var(--accent-soft)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
            {campaign.name}
          </h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {campaign.description || 'No campaign description yet.'}
          </p>
        </div>
        <StatusBadge label={campaign.status} tone={statusTone[campaign.status]} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span className="pill">{formatLanguages(campaign.targetLanguages)}</span>
        <span className="pill">Updated {formatDate(campaign.updatedAt)}</span>
      </div>
    </Link>
  )
}
