import { TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { ReviewState, type Campaign, type ContentPiece } from '@/lib/types';
import { useCallback, useState } from 'react';
import ReviewDialogForm from './ReviewDialogForms';
import { Badge } from '../ui/badge';

interface ContentRowProps {
  campaign?: Campaign;
  content: ContentPiece;
}

const ContentRow = ({ campaign, content }: ContentRowProps) => {
  const [showDialog, setShowDialog] = useState(false);

  const onShowReview = () => {
    setShowDialog(true);
  };
  const onCloseDialog = () => {
    setShowDialog(false);
  };

  const contentReviewBadgeVariant = useCallback(() => {
    switch (content.reviewState) {
      case ReviewState.approved:
        return 'green';
      case ReviewState.rejected:
        return 'red';
      case ReviewState.draft:
        return 'blue';
      case ReviewState.reviewed:
        return 'brown';
      case ReviewState.suggested_by_ai:
        return 'yellow';
      default:
        return 'gray';
    }
  }, [content.reviewState]);

  return (
    <>
      <TableRow className="hover:text-black">
        <TableCell>{content.id}</TableCell>
        <TableCell>{new Date(Date.parse(content.updatedAt)).toLocaleString()}</TableCell>
        <TableCell className="text-center">{content.translations[0]?.languageCode}</TableCell>
        <TableCell className="text-center">
          <Badge variant={contentReviewBadgeVariant()}>{content.reviewState}</Badge>
        </TableCell>
        <TableCell className="text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="hover:text-[#ce26f8]" onClick={onShowReview}>
                <Eye />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Review</TooltipContent>
          </Tooltip>
        </TableCell>
      </TableRow>

      <Dialog open={showDialog} onOpenChange={onCloseDialog}>
        <DialogContent className="min-w-5xl h-[50rem] overflow-auto flex flex-col items-start">
          <DialogHeader className="text-white">
            <DialogTitle className="font-bold">Review Content Information</DialogTitle>
            <DialogDescription className="text-gray-400">
              Review a content. You can aprove or reject it in the next steps.
            </DialogDescription>
          </DialogHeader>
          {content !== null && (
            <div className="text-white flex flex-row items-start">
              <div className="w-1/2 flex flex-col gap-12 items-start">
                <div className="flex flex-col gap-2">
                  <h2 className="font-bold">Data</h2>
                  <p>
                    <span className="font-bold text-gray-400">ID: </span>
                    {content.id}
                  </p>
                  <p>
                    <span className="font-bold text-gray-400">Created At: </span>
                    {content.createdAt}
                  </p>
                  <p>
                    <span className="font-bold text-gray-400">Updated At: </span>
                    {content.updatedAt}
                  </p>
                  <p>
                    <span className="font-bold text-gray-400">Source Language: </span>
                    {content.sourceLanguage}
                  </p>
                  <p>
                    <span className="font-bold text-gray-400">Review: </span>
                    {content.reviewState}
                  </p>
                </div>

                {campaign && <ReviewDialogForm campaign={campaign} content={content} />}
              </div>
              <div className="flex flex-col w-1/2 gap-4 overflow-y-auto scroll-auto">
                <h2 className="font-bold">Translations</h2>
                {[...content.translations].map((translation) => (
                  <div key={translation.id} className="border border-gray-700 p-4 rounded-lg flex flex-col gap-2">
                    <p>
                      <span className="font-bold text-gray-400">ID: </span>
                      {translation.id}
                    </p>
                    <p>
                      <span className="font-bold text-gray-400">Model Provider: </span>
                      {translation.modelProvider || 'N/A'}
                    </p>
                    <p>
                      <span className="font-bold text-gray-400">Language: </span>
                      {translation.languageCode}
                    </p>
                    <p>
                      <span className="font-bold text-gray-400">Title: </span>
                      {translation.translatedTitle}
                    </p>
                    <p>
                      <span className="font-bold text-gray-400">Description: </span>
                      {translation.translatedDescription}
                    </p>
                    <p>
                      <span className="font-bold text-gray-400">Generation Type: </span>
                      {translation.isAIGenerated ? 'AI Generated' : 'Human Generated'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContentRow;
