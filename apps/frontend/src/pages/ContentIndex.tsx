import ContentTable from '@/components/ContentTable/ContentTable';
import { useCampaigns } from '@/context/CampaignContext';
import { isValidUUID } from '@/lib/validators';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowBigLeftDash, LoaderPinwheel, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useGenerationConfig } from '@/context/GenerationConfigContext';
import Spinner from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import * as contentPieceAPI from '@/lib/api/contentPiece';
import Header from '@/components/layout/Header';

const ContentIndex = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const config = useGenerationConfig();
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  if (!isValidUUID(campaignId)) {
    navigate('/404', { replace: true });
    return null;
  }

  if (campaignId === undefined) {
    navigate('/404', { replace: true });
    return null;
  }

  const generateDraft = async () => {
    setIsGeneratingDraft(true);

    await contentPieceAPI.generateDraft(campaignId, config.locale, config.modelProvider);

    setIsGeneratingDraft(false);
  };

  const { campaigns } = useCampaigns();
  const campaign = useMemo(() => campaigns.find((c) => c.id === campaignId), [campaignId, campaigns]);

  if (!campaign) {
    navigate('/404', { replace: true });
    return null;
  }

  return (
    <>
      <Header />
      <div className="flex flex-row items-center justify-between">
        <h1 className="my-8 text-white mt-8">{campaign?.name}'s contents</h1>

        <div className="">
          <Link type="button" to="/campaigns" className="text-white underline">
            <ArrowBigLeftDash className="mr-4" /> Back to Campaigns
          </Link>
        </div>
      </div>

      <div className="w-full p-8 rounded-xl border border-white">
        <div className="flex flex-row items-center justify-between mb-4">
          <div className="mr-16">
            <p className="text-white">Content for Campaign: {campaign?.name}</p>
            <p className="text-white">
              Once a content piece has the 'Suggested By AI' status, it will be updated to'Reviewed'.
            </p>
          </div>

          <div className="flex flex-row items-center space-x-4">
            <button
              type="button"
              className={cn('text-white ml-8 flex flex-row', {
                'opacity-50 cursor-not-allowed': isGeneratingDraft,
                'hover:text-[#ce26f8]': !isGeneratingDraft,
              })}
              onClick={generateDraft}
              disabled={isGeneratingDraft}
            >
              {isGeneratingDraft ? (
                <>
                  <Spinner color="white" size={16} /> <p className="ml-2">Generating</p>
                </>
              ) : (
                <>
                  <LoaderPinwheel /> <p className="ml-2">Generate</p>
                </>
              )}
            </button>
          </div>
        </div>

        <ContentTable campaignId={campaignId} />
      </div>
    </>
  );
};

export default ContentIndex;
