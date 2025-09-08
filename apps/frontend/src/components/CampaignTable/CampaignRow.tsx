import { TableRow, TableCell } from '@/components/ui/table';
import { Plus, Table2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { Campaign } from '@/lib/types';
import { Link } from 'react-router-dom';

const CampaignRow = ({ campaign }: { campaign: Campaign }) => {
  return (
    <TableRow className="hover:text-black">
      <TableCell>{campaign.id}</TableCell>
      <TableCell>{campaign.name}</TableCell>
      <TableCell>{campaign.createdAt}</TableCell>
      <TableCell>{campaign.updatedAt}</TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to={`/campaigns/${campaign.id}/contents`}>
              <button type="button">
                <Table2 />
              </button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="left">View Contents</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link to={`/campaigns/${campaign.id}/edit`}>
              <button type="button" className="ml-4">
                <Plus />
              </button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Edit campaign</TooltipContent>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default CampaignRow;
