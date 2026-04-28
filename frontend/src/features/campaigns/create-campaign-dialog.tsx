import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCampaign } from "@/api/campaigns";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  brief: z.string().optional(),
  source_language: z.string().min(2).max(5).default("en"),
  target_languages: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignDialog({ open, onOpenChange }: Props) {
  const { mutate, isPending } = useCreateCampaign();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormValues) {
    const target_languages = values.target_languages
      ? values.target_languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean)
      : [];
    mutate(
      {
        name: values.name,
        brief: values.brief || null,
        source_language: values.source_language,
        target_languages,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input {...register("name")} placeholder="Summer 2025 Launch" />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Brief</label>
            <Textarea
              {...register("brief")}
              placeholder="Campaign objectives and context…"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Source language</label>
              <Input {...register("source_language")} defaultValue="en" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Target languages</label>
              <Input {...register("target_languages")} placeholder="es, fr, de" />
              <p className="text-muted-foreground text-xs">Comma-separated codes</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
