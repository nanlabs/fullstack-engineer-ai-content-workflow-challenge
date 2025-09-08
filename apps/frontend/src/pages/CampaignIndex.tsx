import CampaignTable from '@/components/CampaignTable/CampaignTable';

function CampaignIndex() {
  return (
    <>
      <h1 className="my-8 text-white">Campaigns</h1>

      <div className="w-full p-8 rounded-xl border border-white">
        <CampaignTable />
      </div>
    </>
  );
}

export default CampaignIndex;
