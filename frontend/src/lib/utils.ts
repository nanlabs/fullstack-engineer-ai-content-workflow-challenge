import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const REVIEW_STATE_COLORS: Record<string, string> = {
  draft: 'badge-draft',
  ai_suggested: 'badge-ai',
  reviewed: 'badge-reviewed',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
};

export const REVIEW_STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  ai_suggested: 'AI Suggested',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const STATUS_BADGE: Record<string, string> = {
  active: 'badge-status-active',
  paused: 'badge-status-paused',
  completed: 'badge-status-completed',
  archived: 'badge-status-archived',
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  headline: 'Headline',
  description: 'Description',
  body: 'Body Copy',
  cta: 'Call to Action',
  tagline: 'Tagline',
};

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  it: 'Italian',
  ru: 'Russian',
};
