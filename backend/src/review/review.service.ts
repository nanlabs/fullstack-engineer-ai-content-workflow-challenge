import {
  Injectable,
  NotFoundException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { ReviewState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { assertTransition } from './review-state.machine';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly events?: EventsGateway,
  ) {}

  /**
   * Transitions a draft from ai_suggested → reviewed.
   * @param draftId - UUID of the draft
   * @returns Updated draft
   * @throws NotFoundException if draft not found
   * @throws ConflictException if state transition is invalid
   */
  async markReviewed(draftId: string) {
    const draft = await this.getDraftWithCampaign(draftId);
    this.validateTransition(draft.reviewState, ReviewState.reviewed);

    const updated = await this.prisma.aiDraft.update({
      where: { id: draftId },
      data: { reviewState: ReviewState.reviewed },
    });

    await this.emitDraftEvent(draft.contentPiece.campaignId, updated);
    return updated;
  }

  /**
   * Approves a reviewed draft, optionally with human-edited text.
   * @param draftId - UUID of the draft
   * @param editedText - Optional human-edited replacement text
   * @returns Updated draft
   * @throws ConflictException if state transition is invalid
   */
  async approve(draftId: string, editedText?: string) {
    const draft = await this.getDraftWithCampaign(draftId);
    this.validateTransition(draft.reviewState, ReviewState.approved);

    const updated = await this.prisma.aiDraft.update({
      where: { id: draftId },
      data: {
        reviewState: ReviewState.approved,
        ...(editedText !== undefined && { editedText }),
      },
    });

    await this.emitDraftEvent(draft.contentPiece.campaignId, updated);
    return updated;
  }

  /**
   * Rejects a reviewed draft with optional reviewer notes.
   * @param draftId - UUID of the draft
   * @param reviewerNotes - Optional rejection reason
   * @returns Updated draft
   * @throws ConflictException if state transition is invalid
   */
  async reject(draftId: string, reviewerNotes?: string) {
    const draft = await this.getDraftWithCampaign(draftId);
    this.validateTransition(draft.reviewState, ReviewState.rejected);

    const updated = await this.prisma.aiDraft.update({
      where: { id: draftId },
      data: {
        reviewState: ReviewState.rejected,
        ...(reviewerNotes !== undefined && { reviewerNotes }),
      },
    });

    await this.emitDraftEvent(draft.contentPiece.campaignId, updated);
    return updated;
  }

  /**
   * Resets a rejected draft back to draft state for regeneration.
   * @param draftId - UUID of the draft
   * @returns Updated draft
   * @throws ConflictException if state transition is invalid
   */
  async reset(draftId: string) {
    const draft = await this.getDraftWithCampaign(draftId);
    this.validateTransition(draft.reviewState, ReviewState.draft);

    const updated = await this.prisma.aiDraft.update({
      where: { id: draftId },
      data: {
        reviewState: ReviewState.draft,
        reviewerNotes: null,
        editedText: null,
      },
    });

    await this.emitDraftEvent(draft.contentPiece.campaignId, updated);
    return updated;
  }

  /**
   * Bulk approve multiple drafts. Each is validated independently.
   * @param draftIds - Array of draft UUIDs
   * @returns Per-draft results with success/failure information
   */
  async bulkApprove(draftIds: string[]) {
    const results = await Promise.allSettled(
      draftIds.map(async (id) => {
        const draft = await this.getDraftWithCampaign(id);
        this.validateTransition(draft.reviewState, ReviewState.approved);

        const updated = await this.prisma.aiDraft.update({
          where: { id },
          data: { reviewState: ReviewState.approved },
        });

        await this.emitDraftEvent(draft.contentPiece.campaignId, updated);
        return updated;
      }),
    );

    return results.map((result, index) => ({
      draftId: draftIds[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : undefined,
      error: result.status === 'rejected' ? (result.reason as Error).message : undefined,
    }));
  }

  private async getDraftWithCampaign(id: string) {
    const draft = await this.prisma.aiDraft.findUnique({
      where: { id },
      include: { contentPiece: { select: { campaignId: true } } },
    });

    if (!draft) {
      throw new NotFoundException(`Draft with id "${id}" not found`);
    }

    return draft;
  }

  private async emitDraftEvent(
    campaignId: string,
    draft: { id: string; reviewState: ReviewState; updatedAt: Date },
  ) {
    await this.events?.emitToCampaign(campaignId, 'draft:updated', {
      draftId: draft.id,
      reviewState: draft.reviewState,
      updatedAt: draft.updatedAt.toISOString(),
    });
  }

  private validateTransition(from: ReviewState, to: ReviewState) {
    try {
      assertTransition(from, to);
    } catch (error) {
      throw new ConflictException((error as Error).message);
    }
  }
}
