import { Layout } from '@/components/layout/Layout';
import { CampaignDashboard } from '@/components/campaigns/CampaignDashboard';

export default function Home() {
  return (
    <Layout>
      <CampaignDashboard />
    </Layout>
  );
}
