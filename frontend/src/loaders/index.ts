import { api } from '../lib/api'

export async function campaignListLoader() {
  return api.getCampaigns()
}

export async function createCampaignLoader() {
  return { title: 'Create Campaign' }
}
