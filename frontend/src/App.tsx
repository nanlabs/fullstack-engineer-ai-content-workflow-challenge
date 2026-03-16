import { CreateCampaignPage } from './pages/CreateCampaignPage';
import { CampaignDetailsPage } from './pages/CampaignDetailsPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  const pathname = window.location.pathname;
  const campaignMatch = pathname.match(/^\/campaigns\/([^/]+)$/);

  if (campaignMatch?.[1]) {
    return <CampaignDetailsPage campaignId={campaignMatch[1]} />;
  }

  if (pathname === '/create') {
    return <CreateCampaignPage />;
  }

  return <DashboardPage />;
}
