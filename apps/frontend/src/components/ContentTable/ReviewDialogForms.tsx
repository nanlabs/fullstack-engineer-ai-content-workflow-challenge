import {
  LocaleOptions,
  ModelProviderOptions,
  useGenerationConfig,
  type Locale,
  type ModelProvider,
} from '@/context/GenerationConfigContext';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select';

import { ReviewState, type Campaign, type ContentPiece } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';
import Spinner from '../ui/spinner';
import { cn } from '@/lib/utils';
import * as contentPieceAPI from '@/lib/api/contentPiece';
import { CheckCheck, Trash2 } from 'lucide-react';

function ReviewDialogForm({ campaign, content }: { campaign: Campaign; content: ContentPiece }) {
  const { locale: defaultLocal, modelProvider: defaultModelProvider } = useGenerationConfig();
  const [locale, setLocale] = useState<Locale>(defaultLocal);
  const [modelProvider, setModelProvider] = useState<ModelProvider>(defaultModelProvider);

  const [isAIGenerating, setIsAIGenerating] = useState(false);

  const onGenerationRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAIGenerating(true);

    await contentPieceAPI.generateDraft(campaign.id, locale, modelProvider, content.id);

    setIsAIGenerating(false);
  };

  const [isUpdatingState, setIsUpdatingState] = useState(false);

  const updateState = async (state: 'approved' | 'rejected') => {
    setIsUpdatingState(true);

    if (state === 'approved') {
      await contentPieceAPI.approve(content.id);
    } else if (state === 'rejected') {
      await contentPieceAPI.reject(content.id);
    }

    setIsUpdatingState(false);
  };

  const canUpdateState = useMemo(() => {
    return content.reviewState !== ReviewState.approved && content.reviewState !== ReviewState.rejected;
  }, [content.reviewState]);

  useEffect(() => {
    if (content.reviewState !== ReviewState.suggested_by_ai) return;

    contentPieceAPI.markAsReviewed(content.id);
  }, [content.reviewState]);

  // if content is already approved or rejected, do not show the form
  if (!canUpdateState) {
    return null;
  }
  return (
    <div className="w-full pr-8">
      <h2 className="font-bold mb-4">Do you like the content? Feel free to generate more!</h2>

      <p className="text-wrap w-full pb-4">
        If you choose to generate content in a language that already has a draft, the existing draft will be
        overwritten.
      </p>
      <p className="text-wrap w-full pb-4">
        If you choose to generate content in a language that does not exist yet, a new translation will be created. This
        will be a translation of the original content, not a newly generated draft.
      </p>

      <form
        className="w-full flex flex-col justify-between gap-4 p-4 border border-gray-700 rounded-lg"
        onSubmit={onGenerationRequestSubmit}
      >
        <div className="flex flex-row gap-8">
          <div>
            <Label htmlFor="locale" className="mb-2">
              Language generation:
            </Label>
            <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Language</SelectLabel>
                  {Object.entries(LocaleOptions).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="locale" className="mb-2">
              Model Provider:
            </Label>
            <Select value={modelProvider} onValueChange={(value) => setModelProvider(value as ModelProvider)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a model provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Model Provider</SelectLabel>
                  {Object.entries(ModelProviderOptions).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <button
          type="submit"
          className={cn(
            'text-white font-bold py-2 px-4 rounded',
            isAIGenerating ? 'opacity-50 cursor-not-allowed!' : 'hover:text-[#ce26f8] cursor-pointer',
          )}
          disabled={isAIGenerating}
        >
          {isAIGenerating ? <Spinner color="white" size={24} /> : 'Generate!'}
        </button>
      </form>

      <div className="mt-4 w-full flex flex-col justify-between gap-4 p-4 border border-gray-700 rounded-lg">
        <button
          type="button"
          className="text-white bg-green-900! hover:bg-green-400! font-bold py-2 px-4 rounded hover:text-black hover:border-green-300! flex flex-row items-center justify-center gap-4 group"
          onClick={() => updateState('approved')}
        >
          {isUpdatingState ? (
            <Spinner color="emerald" size={24} />
          ) : (
            <CheckCheck className="group-hover:text-emerald-900" size={24} />
          )}
          Approve
        </button>
        <button
          type="button"
          className="text-white bg-red-900! hover:bg-red-400! font-bold py-2 px-4 rounded hover:text-black hover:border-red-300! flex flex-row items-center justify-center gap-4 group"
          onClick={() => updateState('rejected')}
        >
          {isUpdatingState ? (
            <Spinner color="fuchsia" size={24} />
          ) : (
            <Trash2 className="group-hover:text-fuchsia-900" size={24} />
          )}
          Reject
        </button>
      </div>
    </div>
  );
}

export default ReviewDialogForm;
