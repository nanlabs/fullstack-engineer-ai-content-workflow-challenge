import CampaignRow from './CampaignRow';
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useCampaigns } from '../../context/CampaignContext';

const CampaignTable = () => {
  const { campaigns } = useCampaigns();

  return (
    <Table>
      <TableCaption className="text-white">A list of your campaigns.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-30 text-white text-xl">ID</TableHead>
          <TableHead className="w-[30rem] text-white text-xl">Name</TableHead>
          <TableHead className="w-40 text-white text-xl">Created At</TableHead>
          <TableHead className="w-40 text-white text-xl">Updated At</TableHead>
          <TableHead className="w-40 text-white text-xl">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="text-white text-lg">
        {campaigns.map((campaign) => (
          <CampaignRow key={campaign.id} campaign={campaign} />
        ))}
      </TableBody>
    </Table>
  );
};

export default CampaignTable;
