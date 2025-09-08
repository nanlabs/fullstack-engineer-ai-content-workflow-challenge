import { useCampaigns } from '@/context/CampaignContext';
import { isValidUUID } from '@/lib/validators';
import { useNavigate, useParams } from 'react-router-dom';

function CampaignEdit() {
  const navigate = useNavigate();
  const campaigns = useCampaigns().campaigns;

  const { campaignId } = useParams();
  const campaign = campaigns.find((c) => c.id === campaignId);

  if (campaignId === undefined || !isValidUUID(campaignId) || !campaign) {
    navigate('/404', { replace: true });
    return null;
  }

  return (
    <>
      <h1 className="my-8 text-white">Edit Campaign</h1>

      <div className="w-full p-8 rounded-xl border border-white">Hola</div>
    </>
  );
}

export default CampaignEdit;
