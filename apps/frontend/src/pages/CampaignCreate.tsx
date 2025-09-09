import Spinner from '@/components/ui/spinner';
import { ArrowBigLeftDash } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as campaignAPI from '@/lib/api/campaign';
import Header from '@/components/layout/Header';

function CampaignCreate() {
  const [newCampaignName, setNewCampaignName] = useState<string>('');
  const [newCampaignDescription, setNewCampaignDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const navigator = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await campaignAPI.create({
      name: newCampaignName,
      description: newCampaignDescription,
    });
    navigator('/campaigns');

    setIsLoading(false);
  };

  return (
    <>
      <Header />
      <div className="flex flex-row items-center justify-between gap-16">
        <h1 className="my-8 text-white">Create a Campaign</h1>

        <div className="">
          <Link type="button" to="/campaigns" className="text-white underline flex flex-row items-center">
            <ArrowBigLeftDash className="mr-4" /> Back to Campaigns
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full p-8 rounded-xl border border-white">
        <div className="mb-6">
          <label htmlFor="campaignName" className="block mb-2 text-sm font-medium text-white">
            Campaign Name
          </label>
          <input
            type="text"
            id="campaignName"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="My Awesome Campaign"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="campaignDescription" className="block mb-2 text-sm font-medium text-white">
            Campaign Description
          </label>
          <textarea
            id="campaignDescription"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="This campaign is all about..."
            value={newCampaignDescription}
            onChange={(e) => setNewCampaignDescription(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
            disabled={isLoading}
          >
            {isLoading ? <Spinner color="white" size={24} /> : 'Create Campaign'}
          </button>
        </div>
      </form>
    </>
  );
}

export default CampaignCreate;
