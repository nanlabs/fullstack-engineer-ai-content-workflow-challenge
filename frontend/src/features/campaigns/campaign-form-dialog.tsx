import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { XIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCampaign, useUpdateCampaign } from "@/api/campaigns";
import type { Campaign } from "@/api/types";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt-BR", label: "Portuguese (BR)" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
];

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  brief: z.string().optional(),
  source_language: z.string().min(2),
  target_languages: z.array(z.string()).min(1, "Select at least one target language"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign;
}

export function CampaignFormDialog({ open, onOpenChange, campaign }: Props) {
  const navigate = useNavigate();
  const isEdit = !!campaign;

  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign(campaign?.id ?? "");
  const isPending = isEdit ? updateMutation.isPending : createMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      brief: "",
      source_language: "en",
      target_languages: [],
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: campaign?.name ?? "",
        brief: campaign?.brief ?? "",
        source_language: campaign?.source_language ?? "en",
        target_languages: campaign?.target_languages ?? [],
      });
    }
  }, [open, campaign, reset]);

  const selectedTargetLanguages = watch("target_languages");
  const sourceLanguage = watch("source_language");

  const availableTargetLanguages = LANGUAGES.filter(
    (l) => l.value !== sourceLanguage && !selectedTargetLanguages.includes(l.value)
  );

  function addTargetLanguage(lang: string) {
    setValue("target_languages", [...selectedTargetLanguages, lang], { shouldValidate: true });
  }

  function removeTargetLanguage(lang: string) {
    setValue(
      "target_languages",
      selectedTargetLanguages.filter((l) => l !== lang),
      { shouldValidate: true }
    );
  }

  function onSubmit(values: FormValues) {
    if (isEdit) {
      updateMutation.mutate(
        {
          name: values.name,
          brief: values.brief || null,
          target_languages: values.target_languages,
        },
        {
          onSuccess: () => {
            toast.success("Campaign updated");
            onOpenChange(false);
          },
          onError: (err) => {
            toast.error(err.message ?? "Failed to update campaign");
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          name: values.name,
          brief: values.brief || null,
          source_language: values.source_language,
          target_languages: values.target_languages,
        },
        {
          onSuccess: (created) => {
            toast.success("Campaign created");
            onOpenChange(false);
            navigate(`/campaigns/${created.id}`);
          },
          onError: (err) => {
            toast.error(err.message ?? "Failed to create campaign");
          },
        }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Campaign" : "New Campaign"}</DialogTitle>
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

          <div className="space-y-1">
            <label className="text-sm font-medium">Source language</label>
            {isEdit ? (
              <p className="text-muted-foreground text-sm">{campaign?.source_language}</p>
            ) : (
              <Select
                value={sourceLanguage}
                onValueChange={(v) => setValue("source_language", v, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target languages</label>
            <div className="flex min-h-[32px] flex-wrap gap-1">
              {selectedTargetLanguages.map((lang) => (
                <Badge key={lang} variant="secondary" className="gap-1 pr-1">
                  {lang}
                  <button
                    type="button"
                    onClick={() => removeTargetLanguage(lang)}
                    className="hover:text-destructive ml-0.5 rounded"
                    aria-label={`Remove ${lang}`}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {availableTargetLanguages.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {availableTargetLanguages.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => addTargetLanguage(l.value)}
                    className="text-muted-foreground hover:text-foreground hover:bg-accent rounded border px-2 py-0.5 text-xs transition-colors"
                  >
                    + {l.label}
                  </button>
                ))}
              </div>
            )}
            {errors.target_languages && (
              <p className="text-destructive text-xs">{errors.target_languages.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
