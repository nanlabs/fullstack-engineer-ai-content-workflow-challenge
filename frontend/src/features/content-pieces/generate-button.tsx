import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStartWorkflow } from "@/api/content-pieces";

interface Props {
  contentPieceId: string;
  onStart?: (threadId: string) => void;
  disabled?: boolean;
}

export function GenerateButton({ contentPieceId, onStart, disabled }: Props) {
  const { mutate, isPending } = useStartWorkflow();

  function handleClick() {
    mutate(
      { contentPieceId },
      {
        onSuccess: (data) => {
          onStart?.(data.thread_id);
        },
        onError: (err) => {
          toast.error(err.message ?? "Failed to start generation");
        },
      }
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending || disabled} onClick={handleClick}>
      <SparklesIcon className="mr-1.5 h-4 w-4" />
      {isPending ? "Starting…" : "Generate with AI"}
    </Button>
  );
}
