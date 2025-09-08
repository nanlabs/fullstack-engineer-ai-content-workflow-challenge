import ContentTable from '@/components/ContentTable/ContentTable';
import { useCampaigns } from '@/context/CampaignContext';
import { isValidUUID } from '@/lib/validators';
import { useParams, useNavigate, Link } from 'react-router-dom';

const ContentIndex = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  if (!isValidUUID(campaignId)) {
    navigate('/404', { replace: true });
    return null;
  }

  if (campaignId === undefined) {
    navigate('/404', { replace: true });
    return null;
  }

  const campaign = useCampaigns().campaigns.find((c) => c.id === campaignId);

  return (
    <>
      <div className="flex flex-row items-center justify-between">
        <h1 className="my-8 text-white">{campaign?.name}'s contents</h1>

        <div className="">
          <Link type="button" to="/campaigns" className="text-white underline">
            Back to Campaigns
          </Link>
        </div>
      </div>

      <div className="w-full p-8 rounded-xl border border-white">
        <p className="text-white">Content for Campaign: {campaign?.name}</p>

        <ContentTable campaignId={campaignId} />
      </div>
    </>
  );
};

export default ContentIndex;
