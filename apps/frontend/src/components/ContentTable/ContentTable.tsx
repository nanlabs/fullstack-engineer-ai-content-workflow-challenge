import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCampaigns } from '../../context/CampaignContext';
import ContentRow from './ContentRow';

const ContentTable = ({ campaignId }: { campaignId: string }) => {
  const { campaigns } = useCampaigns();
  const campaign = campaigns.find((c) => c.id === campaignId);

  return (
    <Table>
      <TableCaption className="text-white">A list of contents for campaign {campaign?.name}.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-30 text-white text-xl">ID</TableHead>
          <TableHead className="w-20 text-white text-xl">Updated at</TableHead>
          <TableHead className="w-40 text-white text-center text-xl">Language</TableHead>
          <TableHead className="w-40 text-white text-center text-xl">Review</TableHead>
          <TableHead className="w-40 text-white text-center text-xl">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="text-white text-lg">
        {campaign?.contentPieces.map((content) => (
          <ContentRow key={content.id} content={content} campaign={campaign} />
        ))}
      </TableBody>
    </Table>
  );
};

export default ContentTable;
