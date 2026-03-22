'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ContentType, CreateContentData } from '@/types';

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'HEADLINE', label: 'Headline' },
  { value: 'DESCRIPTION', label: 'Description' },
  { value: 'CTA', label: 'Call to Action' },
  { value: 'TAGLINE', label: 'Tagline' },
  { value: 'BODY_COPY', label: 'Body Copy' },
];

interface ContentFormProps {
  onSubmit: (data: CreateContentData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ContentForm({ onSubmit, onCancel, isLoading }: ContentFormProps) {
  const [type, setType] = useState<ContentType>('HEADLINE');
  const [originalText, setOriginalText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!originalText.trim()) newErrors.originalText = 'Content text is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ type, originalText: originalText.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="content-type" required>
          Content Type
        </Label>
        <Select
          id="content-type"
          value={type}
          onChange={(e) => setType(e.target.value as ContentType)}
          disabled={isLoading}
        >
          {CONTENT_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="original-text" required>
          Original Text
        </Label>
        <Textarea
          id="original-text"
          placeholder="Enter the original content text that will be used as the basis for AI generation…"
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
          error={errors.originalText}
          rows={4}
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
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
          Add Content
        </Button>
      </div>
    </form>
  );
}
