'use client';

import { useState, type FormEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { CreateCampaignData } from '@/types';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
];

interface CampaignFormProps {
  onSubmit: (data: CreateCampaignData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CampaignForm({ onSubmit, onCancel, isLoading }: CampaignFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetLangs, setTargetLangs] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleLanguage(lang: string) {
    setTargetLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Campaign name is required';
    if (name.trim().length > 100) newErrors.name = 'Name must be under 100 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      targetLangs,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="campaign-name" required>
          Campaign Name
        </Label>
        <Input
          id="campaign-name"
          placeholder="e.g. Summer Product Launch 2024"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="campaign-description">Description</Label>
        <Textarea
          id="campaign-description"
          placeholder="Brief description of this campaign's goals and audience…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isLoading}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>Target Languages</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => {
            const selected = targetLangs.includes(lang.value);
            return (
              <button
                key={lang.value}
                type="button"
                onClick={() => toggleLanguage(lang.value)}
                disabled={isLoading}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {selected && <Plus className="h-3 w-3 rotate-45" />}
                {lang.label}
              </button>
            );
          })}
        </div>
        {targetLangs.length > 0 && (
          <p className="text-xs text-gray-500">{targetLangs.length} language(s) selected</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} size="sm">
          Create Campaign
        </Button>
      </div>
    </form>
  );
}
