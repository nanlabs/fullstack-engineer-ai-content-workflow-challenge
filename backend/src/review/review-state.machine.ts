import { ReviewState } from '@prisma/client';

const VALID_TRANSITIONS: Record<ReviewState, ReviewState[]> = {
  [ReviewState.draft]: [ReviewState.ai_suggested],
  [ReviewState.ai_suggested]: [ReviewState.reviewed],
  [ReviewState.reviewed]: [ReviewState.approved, ReviewState.rejected],
  [ReviewState.approved]: [],
  [ReviewState.rejected]: [ReviewState.draft],
};

/**
 * @param from - Current review state
 * @param to - Target review state
 * @returns true if the transition is valid per the state machine
 */
export function canTransition(from: ReviewState, to: ReviewState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * @param state - Current review state
 * @returns Array of valid next states
 */
export function getValidTransitions(state: ReviewState): ReviewState[] {
  return VALID_TRANSITIONS[state] ?? [];
}

/**
 * @param from - Current state
 * @param to - Desired target state
 * @throws Error with descriptive message if transition is invalid
 */
export function assertTransition(from: ReviewState, to: ReviewState): void {
  if (!canTransition(from, to)) {
    const validTargets = getValidTransitions(from);
    const validStr = validTargets.length > 0 ? validTargets.join(', ') : 'none (terminal state)';
    throw new Error(
      `Invalid state transition: "${from}" → "${to}". Valid transitions from "${from}": ${validStr}`,
    );
  }
}
