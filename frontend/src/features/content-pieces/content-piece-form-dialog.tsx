import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateContentPiece } from "@/api/content-pieces";

const schema = z.object({
  type: z.enum(["headline", "description", "cta", "body"]),
  title: z.string().min(1, "Title is required").max(200),
  source_text: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentPieceFormDialog({ campaignId, open, onOpenChange }: Props) {
  const { mutate, isPending } = useCreateContentPiece(campaignId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "headline", title: "", source_text: "" },
  });

  const typeValue = watch("type");

  function onSubmit(values: FormValues) {
    mutate(
      {
        type: values.type,
        title: values.title,
        source_text: values.source_text || null,
      },
      {
        onSuccess: () => {
          toast.success("Content piece created");
          reset();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err.message ?? "Failed to create content piece");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Content Piece</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Type</label>
            <Select
              value={typeValue}
              onValueChange={(v) =>
                setValue("type", v as FormValues["type"], { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="headline">Headline</SelectItem>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="cta">CTA</SelectItem>
                <SelectItem value="body">Body</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-destructive text-xs">{errors.type.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <Input {...register("title")} placeholder="Hero banner main" />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Source text <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              {...register("source_text")}
              placeholder="Any extra context for the AI…"
              rows={3}
            />
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
