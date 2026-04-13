import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ReviewState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertTransition } from './review-state.machine';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transitions a draft from ai_suggested → reviewed.
   * @param draftId - UUID of the draft
   * @returns Updated draft
   * @throws NotFoundException if draft not found
   * @throws ConflictException if state transition is invalid
   */
  async markReviewed(draftId: string) {
    const draft = await this.getDraft(draftId);
    this.validateTransition(draft.reviewState, ReviewState.reviewed);

    return this.prisma.aiDraft.update({
      where: { id: draftId },
      data: { reviewState: ReviewState.reviewed },
    });
  }

  /**
   * Approves a reviewed draft, optionally with human-edited text.
   * @param draftId - UUID of the draft
   * @param editedText - Optional human-edited replacement text
   * @returns Updated draft
   * @throws ConflictException if state transition is invalid
   */
  async approve(draftId: string, editedText?: string) {
    const draft = await this.getDraft(draftId);
    this.validateTransition(draft.reviewState, ReviewState.approved);

    return this.prisma.aiDraft.update({
      where: { id: draftId },
      data: {
        reviewState: ReviewState.approved,
        ...(editedText !== undefined && { editedText }),
      },
    });
  }

  /**
   * Rejects a reviewed draft with optional reviewer notes.
   * @param draftId - UUID of the draft
   * @param reviewerNotes - Optional rejection reason
   * @returns Updated draft
   * @throws ConflictException if state transition is invalid
   */
  async reject(draftId: string, reviewerNotes?: string) {
    const draft = await this.getDraft(draftId);
    this.validateTransition(draft.reviewState, ReviewState.rejected);

    return this.prisma.aiDraft.update({
      where: { id: draftId },
      data: {
        reviewState: ReviewState.rejected,
        ...(reviewerNotes !== undefined && { reviewerNotes }),
      },
    });
  }

  /**
   * Resets a rejected draft back to draft state for regeneration.
   * @param draftId - UUID of the draft
   * @returns Updated draft
   * @throws ConflictException if state transition is invalid
   */
  async reset(draftId: string) {
    const draft = await this.getDraft(draftId);
    this.validateTransition(draft.reviewState, ReviewState.draft);

    return this.prisma.aiDraft.update({
      where: { id: draftId },
      data: {
        reviewState: ReviewState.draft,
        reviewerNotes: null,
        editedText: null,
      },
    });
  }

  /**
   * Bulk approve multiple drafts. Each is validated independently.
   * @param draftIds - Array of draft UUIDs
   * @returns Per-draft results with success/failure information
   */
  async bulkApprove(draftIds: string[]) {
    const results = await Promise.allSettled(
      draftIds.map(async (id) => {
        const draft = await this.getDraft(id);
        this.validateTransition(draft.reviewState, ReviewState.approved);

        return this.prisma.aiDraft.update({
          where: { id },
          data: { reviewState: ReviewState.approved },
        });
      }),
    );

    return results.map((result, index) => ({
      draftId: draftIds[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : undefined,
      error: result.status === 'rejected' ? (result.reason as Error).message : undefined,
    }));
  }

  private async getDraft(id: string) {
    const draft = await this.prisma.aiDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      throw new NotFoundException(`Draft with id "${id}" not found`);
    }

    return draft;
  }

  private validateTransition(from: ReviewState, to: ReviewState) {
    try {
      assertTransition(from, to);
    } catch (error) {
      throw new ConflictException((error as Error).message);
    }
  }
}
