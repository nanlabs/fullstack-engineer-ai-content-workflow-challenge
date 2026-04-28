import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteCampaign } from "@/api/campaigns";

interface Props {
  campaignId: string;
  campaignName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteCampaignConfirm({ campaignId, campaignName, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { mutate, isPending } = useDeleteCampaign();

  function handleDelete() {
    mutate(campaignId, {
      onSuccess: () => {
        toast.success("Campaign deleted");
        onOpenChange(false);
        navigate("/campaigns");
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to delete campaign");
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{campaignName}</strong> and all its content pieces
            and drafts. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
