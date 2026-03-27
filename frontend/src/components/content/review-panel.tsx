'use client';

import { useState, useEffect } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/badge';
import type { ContentStatus, ReviewContentData } from '@/types';

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'AI_SUGGESTED', label: 'AI Suggested' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

interface ReviewPanelProps {
  currentStatus: ContentStatus;
  currentNotes?: string;
  onSave: (data: ReviewContentData) => Promise<void>;
  isLoading?: boolean;
}

export function ReviewPanel({
  currentStatus,
  currentNotes,
  onSave,
  isLoading,
}: ReviewPanelProps) {
  const [status, setStatus] = useState<ContentStatus>(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? '');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setStatus(currentStatus);
    setNotes(currentNotes ?? '');
    setIsDirty(false);
  }, [currentStatus, currentNotes]);

  function handleStatusChange(val: ContentStatus) {
    setStatus(val);
    setIsDirty(true);
  }

  function handleNotesChange(val: string) {
    setNotes(val);
    setIsDirty(true);
  }

  async function handleSave() {
    await onSave({ status, reviewNotes: notes.trim() || undefined });
    setIsDirty(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Review</h3>
          <div className="ml-auto">
            <StatusBadge status={currentStatus} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="review-status">Status</Label>
          <Select
            id="review-status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as ContentStatus)}
            disabled={isLoading}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="review-notes">Review Notes</Label>
          <Textarea
            id="review-notes"
            placeholder="Add notes about this content piece for the team…"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={3}
            disabled={isLoading}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleSave}
          isLoading={isLoading}
          disabled={!isDirty}
          size="sm"
          className="w-full"
        >
          Save Review
        </Button>
      </CardContent>
    </Card>
  );
}
