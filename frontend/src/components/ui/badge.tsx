import { cn } from '@/lib/utils';
import {
  getStatusColors,
  getStatusLabel,
  getModelColors,
  getModelLabel,
  getContentTypeColors,
  getContentTypeLabel,
} from '@/lib/utils';
import type { ContentStatus, AIModel, ContentType } from '@/types';

interface BadgeProps {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'outline';
}

export function Badge({ className, children, variant = 'outline' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
        variant === 'outline' ? 'bg-white' : '',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <Badge className={getStatusColors(status)}>{getStatusLabel(status)}</Badge>
  );
}

export function ModelBadge({ model }: { model: AIModel }) {
  return (
    <Badge className={getModelColors(model)}>{getModelLabel(model)}</Badge>
  );
}

export function ContentTypeBadge({ type }: { type: ContentType }) {
  return (
    <Badge className={getContentTypeColors(type)}>
      {getContentTypeLabel(type)}
    </Badge>
  );
}

export function LanguageBadge({ language }: { language: string }) {
  return (
    <Badge className="bg-violet-50 text-violet-700 border-violet-200">
      {language.toUpperCase()}
    </Badge>
  );
}
