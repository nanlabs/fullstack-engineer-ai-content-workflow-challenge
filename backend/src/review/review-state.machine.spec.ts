import { ReviewState } from '@prisma/client';
import { canTransition, getValidTransitions, assertTransition } from './review-state.machine';

describe('Review State Machine', () => {
  describe('canTransition', () => {
    const validCases: [ReviewState, ReviewState][] = [
      [ReviewState.draft, ReviewState.ai_suggested],
      [ReviewState.ai_suggested, ReviewState.reviewed],
      [ReviewState.reviewed, ReviewState.approved],
      [ReviewState.reviewed, ReviewState.rejected],
      [ReviewState.rejected, ReviewState.draft],
    ];

    it.each(validCases)('should allow %s → %s', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });

    const invalidCases: [ReviewState, ReviewState][] = [
      [ReviewState.draft, ReviewState.approved],
      [ReviewState.draft, ReviewState.reviewed],
      [ReviewState.draft, ReviewState.rejected],
      [ReviewState.ai_suggested, ReviewState.approved],
      [ReviewState.ai_suggested, ReviewState.rejected],
      [ReviewState.ai_suggested, ReviewState.draft],
      [ReviewState.reviewed, ReviewState.draft],
      [ReviewState.reviewed, ReviewState.ai_suggested],
      [ReviewState.approved, ReviewState.draft],
      [ReviewState.approved, ReviewState.reviewed],
      [ReviewState.approved, ReviewState.rejected],
      [ReviewState.rejected, ReviewState.approved],
      [ReviewState.rejected, ReviewState.reviewed],
      [ReviewState.rejected, ReviewState.ai_suggested],
    ];

    it.each(invalidCases)('should reject %s → %s', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('should return [ai_suggested] for draft', () => {
      expect(getValidTransitions(ReviewState.draft)).toEqual([ReviewState.ai_suggested]);
    });

    it('should return [reviewed] for ai_suggested', () => {
      expect(getValidTransitions(ReviewState.ai_suggested)).toEqual([ReviewState.reviewed]);
    });

    it('should return [approved, rejected] for reviewed', () => {
      expect(getValidTransitions(ReviewState.reviewed)).toEqual([
        ReviewState.approved,
        ReviewState.rejected,
      ]);
    });

    it('should return [] for approved (terminal)', () => {
      expect(getValidTransitions(ReviewState.approved)).toEqual([]);
    });

    it('should return [draft] for rejected', () => {
      expect(getValidTransitions(ReviewState.rejected)).toEqual([ReviewState.draft]);
    });
  });

  describe('assertTransition', () => {
    it('should not throw for valid transitions', () => {
      expect(() => assertTransition(ReviewState.draft, ReviewState.ai_suggested)).not.toThrow();
    });

    it('should throw with descriptive message for invalid transitions', () => {
      expect(() => assertTransition(ReviewState.draft, ReviewState.approved)).toThrow(
        /Invalid state transition: "draft" → "approved"/,
      );
    });

    it('should mention valid alternatives in error message', () => {
      expect(() => assertTransition(ReviewState.reviewed, ReviewState.draft)).toThrow(
        /approved, rejected/,
      );
    });
  });
});
