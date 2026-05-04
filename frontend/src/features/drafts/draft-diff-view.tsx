import ReactDiffViewer from "react-diff-viewer-continued";

interface Props {
  aiContent: string;
  editedContent: string;
}

export function DraftDiffView({ aiContent, editedContent }: Props) {
  return (
    <div className="overflow-hidden rounded-md border text-xs">
      <p className="text-muted-foreground border-b px-3 py-1.5 text-xs font-medium">
        Diff vs original
      </p>
      <div className="overflow-x-auto">
        <ReactDiffViewer
          oldValue={aiContent}
          newValue={editedContent}
          splitView={false}
          hideLineNumbers
          showDiffOnly={false}
          useDarkTheme
        />
      </div>
    </div>
  );
}
