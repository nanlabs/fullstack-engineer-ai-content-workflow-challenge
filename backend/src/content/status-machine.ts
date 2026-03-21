import { ContentStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

const VALID_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  [ContentStatus.DRAFT]: [ContentStatus.AI_SUGGESTED],
  [ContentStatus.AI_SUGGESTED]: [
    ContentStatus.REVIEWED,
    ContentStatus.APPROVED,
    ContentStatus.REJECTED,
  ],
  [ContentStatus.REVIEWED]: [ContentStatus.APPROVED, ContentStatus.REJECTED],
  [ContentStatus.APPROVED]: [],
  [ContentStatus.REJECTED]: [ContentStatus.DRAFT],
};

export function validateStatusTransition(
  current: ContentStatus,
  next: ContentStatus,
): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new BadRequestException(
      `Invalid status transition: ${current} → ${next}. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }
}
