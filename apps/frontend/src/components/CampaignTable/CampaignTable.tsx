import CampaignRow from './CampaignRow';
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useCampaigns } from '../../context/CampaignContext';

const CampaignTable = () => {
  const { campaigns } = useCampaigns();

  return (
    <Table>
      <TableCaption className="text-gray-300">A list of your campaigns.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30rem] text-gray-300 text-xl">Name</TableHead>
          <TableHead className="w-40 text-gray-300 text-xl">Created At</TableHead>
          <TableHead className="w-40 text-gray-300 text-xl">Updated At</TableHead>
          <TableHead className="w-40 text-gray-300 text-center text-xl">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="text-gray-300 text-lg">
        {campaigns.map((campaign) => (
          <CampaignRow key={campaign.id} campaign={campaign} />
        ))}
      </TableBody>
    </Table>
  );
};

export default CampaignTable;
