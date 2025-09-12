import CampaignTable from '@/components/CampaignTable/CampaignTable';
import Header from '@/components/layout/Header';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

function CampaignIndex() {
  return (
    <>
      <Header />
      <h1 className="text-5xl my-8 text-white">Campaigns</h1>

      <div className="w-full p-8 rounded-xl border border-gray-600">
        <div className="flex items-center justify-between mb-8">
          <div className="text-2xl font-semibold text-gray-300">List of Campaigns</div>
          <Link to="/campaigns/new" className="flex items-center">
            <Plus className="mr-2" /> Create New Campaign
          </Link>
        </div>
        <CampaignTable />
      </div>
    </>
  );
}

export default CampaignIndex;
