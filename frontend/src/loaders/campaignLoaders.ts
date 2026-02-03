import { api } from '../lib/api'

type LoaderArgs = {
  params: Record<string, string | undefined>
}

export const campaignDetailLoader = async ({ params }: LoaderArgs) => {
  if (!params.id) {
    throw new Response('Campaign not found', { status: 404 })
  }

  return api.getCampaign(params.id)
}
