import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ContentStatus, AIModel, ContentType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

export function getStatusColors(status: ContentStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'AI_SUGGESTED':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'UNDER_REVIEW':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'APPROVED':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function getStatusLabel(status: ContentStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'AI_SUGGESTED':
      return 'AI Suggested';
    case 'UNDER_REVIEW':
      return 'Under Review';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
}

export function getModelColors(model: AIModel): string {
  switch (model) {
    case 'CLAUDE_3_5_SONNET':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'GPT_4O':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function getModelLabel(model: AIModel): string {
  switch (model) {
    case 'CLAUDE_3_5_SONNET':
      return 'Claude 3.5 Sonnet';
    case 'GPT_4O':
      return 'GPT-4o';
    default:
      return model;
  }
}

export function getContentTypeLabel(type: ContentType): string {
  switch (type) {
    case 'HEADLINE':
      return 'Headline';
    case 'DESCRIPTION':
      return 'Description';
    case 'CTA':
      return 'Call to Action';
    case 'TAGLINE':
      return 'Tagline';
    case 'BODY_COPY':
      return 'Body Copy';
    default:
      return type;
  }
}

export function getContentTypeColors(type: ContentType): string {
  switch (type) {
    case 'HEADLINE':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'DESCRIPTION':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'CTA':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'TAGLINE':
      return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'BODY_COPY':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function getLanguageLabel(code: string): string {
  const labels: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    it: 'Italian',
    ja: 'Japanese',
    zh: 'Chinese',
  };
  return labels[code] ?? code.toUpperCase();
}
