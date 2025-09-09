import { TableRow, TableCell } from '@/components/ui/table';
import { Table2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { Campaign } from '@/lib/types';
import { Link } from 'react-router-dom';

const CampaignRow = ({ campaign }: { campaign: Campaign }) => {
  return (
    <TableRow className="hover:text-black">
      <TableCell>{campaign.name}</TableCell>
      <TableCell>{new Date(Date.parse(campaign.createdAt)).toLocaleString()}</TableCell>
      <TableCell>{new Date(Date.parse(campaign.updatedAt)).toLocaleString()}</TableCell>
      <TableCell className="text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to={`/campaigns/${campaign.id}/contents`}>
              <button type="button" className="mr-2">
                <Table2 />
              </button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">View contents</TooltipContent>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default CampaignRow;
