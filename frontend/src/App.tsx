import { CreateCampaignPage } from './pages/CreateCampaignPage'
import { CampaignDetailsPage } from './pages/CampaignDetailsPage'

export default function App() {
  const pathname = window.location.pathname
  const campaignMatch = pathname.match(/^\/campaigns\/([^/]+)$/)

  if (campaignMatch?.[1]) {
    return <CampaignDetailsPage campaignId={campaignMatch[1]} />
  }

  return <CreateCampaignPage />
}
