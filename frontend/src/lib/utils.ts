import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const REVIEW_STATE_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ai_suggested: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export const REVIEW_STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  ai_suggested: 'AI Suggested',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
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
