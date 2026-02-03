import { Link, useLoaderData } from 'react-router-dom'

import CampaignCard from '../components/CampaignCard'
import EmptyState from '../components/EmptyState'
import SectionHeader from '../components/SectionHeader'
import type { Campaign } from '../lib/types'

export default function CampaignList() {
  const campaigns = useLoaderData() as Campaign[]

  return (
    <section className="space-y-8">
      <SectionHeader
        title="Campaign Dashboard"
        subtitle="Track every content initiative, from first draft to final approval, with live AI and review signals."
        action={
          <Link
            to="/campaigns/new"
            className="rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-panel transition hover:bg-[var(--accent-strong)]"
          >
            Create Campaign
          </Link>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Spin up a new campaign and start drafting AI-assisted content in minutes."
          action={
            <Link
              to="/campaigns/new"
              className="rounded-full border border-[var(--line)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)]"
            >
              Start a campaign
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {campaigns.map((campaign, index) => (
            <div
              key={campaign.id}
              className="opacity-0 animate-fade-up"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <CampaignCard campaign={campaign} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
