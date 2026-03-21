import { BadRequestException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { validateStatusTransition } from './status-machine';

describe('validateStatusTransition', () => {
  const validTransitions: [ContentStatus, ContentStatus][] = [
    [ContentStatus.DRAFT, ContentStatus.AI_SUGGESTED],
    [ContentStatus.AI_SUGGESTED, ContentStatus.REVIEWED],
    [ContentStatus.AI_SUGGESTED, ContentStatus.APPROVED],
    [ContentStatus.AI_SUGGESTED, ContentStatus.REJECTED],
    [ContentStatus.REVIEWED, ContentStatus.APPROVED],
    [ContentStatus.REVIEWED, ContentStatus.REJECTED],
    [ContentStatus.REJECTED, ContentStatus.DRAFT],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(() => validateStatusTransition(from, to)).not.toThrow();
  });

  const invalidTransitions: [ContentStatus, ContentStatus][] = [
    [ContentStatus.DRAFT, ContentStatus.APPROVED],
    [ContentStatus.DRAFT, ContentStatus.REVIEWED],
    [ContentStatus.DRAFT, ContentStatus.REJECTED],
    [ContentStatus.DRAFT, ContentStatus.DRAFT],
    [ContentStatus.AI_SUGGESTED, ContentStatus.DRAFT],
    [ContentStatus.AI_SUGGESTED, ContentStatus.AI_SUGGESTED],
    [ContentStatus.REVIEWED, ContentStatus.DRAFT],
    [ContentStatus.REVIEWED, ContentStatus.AI_SUGGESTED],
    [ContentStatus.REVIEWED, ContentStatus.REVIEWED],
    [ContentStatus.APPROVED, ContentStatus.DRAFT],
    [ContentStatus.APPROVED, ContentStatus.REVIEWED],
    [ContentStatus.APPROVED, ContentStatus.REJECTED],
    [ContentStatus.APPROVED, ContentStatus.AI_SUGGESTED],
    [ContentStatus.REJECTED, ContentStatus.APPROVED],
    [ContentStatus.REJECTED, ContentStatus.REVIEWED],
    [ContentStatus.REJECTED, ContentStatus.AI_SUGGESTED],
  ];

  it.each(invalidTransitions)('rejects %s → %s', (from, to) => {
    expect(() => validateStatusTransition(from, to)).toThrow(BadRequestException);
  });

  it('includes helpful message on invalid transition', () => {
    expect(() =>
      validateStatusTransition(ContentStatus.DRAFT, ContentStatus.APPROVED),
    ).toThrow(/Invalid status transition: DRAFT → APPROVED/);
  });
});
