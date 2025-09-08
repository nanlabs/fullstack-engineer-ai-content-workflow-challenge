import { TableRow, TableCell } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { Campaign, Content } from '@/lib/types';
import { Link } from 'react-router-dom';

interface ContentRowProps {
  campaign: Campaign;
  content: Content;
}

const ContentRow = ({ campaign, content }: ContentRowProps) => {
  return (
    <TableRow className="hover:text-black">
      <TableCell>{content.id}</TableCell>
      <TableCell>{content.updatedAt}</TableCell>
      <TableCell>{content.translations[0]?.languageCode}</TableCell>
      <TableCell>{content.reviewState}</TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to={`/campaigns/${campaign.id}/contents/${content.id}`}>
              <button type="button">
                <Plus />
              </button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Review</TooltipContent>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default ContentRow;
