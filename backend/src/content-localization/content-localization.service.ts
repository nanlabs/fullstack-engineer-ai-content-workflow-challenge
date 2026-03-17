import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewStatus } from '../status-enum';
import { EventsService } from '../events/events.service';
import { ContentLocalization } from './content-localizations.entity';
import { UpdateLocalizationContentDto } from './dto/update-localization-content.dto';
import { UpdateLocalizationStatusDto } from './dto/update-localization-status.dto';

@Injectable()
export class ContentLocalizationService {
  private readonly allowedTransitions: Record<ReviewStatus, ReviewStatus[]> = {
    [ReviewStatus.DRAFT]: [ReviewStatus.AI_SUGGESTED],
    [ReviewStatus.AI_SUGGESTED]: [ReviewStatus.REVIEWED, ReviewStatus.REJECTED],
    [ReviewStatus.REVIEWED]: [ReviewStatus.APPROVED, ReviewStatus.REJECTED],
    [ReviewStatus.APPROVED]: [],
    [ReviewStatus.REJECTED]: [],
  };

  constructor(
    @InjectRepository(ContentLocalization)
    private readonly localizationRepo: Repository<ContentLocalization>,
    private readonly eventsService: EventsService,
  ) {}

  async updateStatus(
    id: string,
    payload: UpdateLocalizationStatusDto,
  ): Promise<ContentLocalization> {
    const localization = await this.getByIdOrThrow(id);
    this.assertTransition(localization.status, payload.status);
    localization.status = payload.status;
    const saved = await this.localizationRepo.save(localization);

    await this.emitStatusChange(saved);

    return saved;
  }

  async updateContent(
    id: string,
    payload: UpdateLocalizationContentDto,
  ): Promise<ContentLocalization> {
    const localization = await this.getByIdOrThrow(id);

    if (
      localization.status === ReviewStatus.APPROVED ||
      localization.status === ReviewStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Cannot edit content after it is finalized (APPROVED or REJECTED)',
      );
    }

    if (payload.titleSuggestion !== undefined) {
      localization.titleSuggestion = payload.titleSuggestion;
    }

    if (payload.bodySuggestion !== undefined) {
      localization.bodySuggestion = payload.bodySuggestion;
    }

    // Human edits imply the AI suggestion has been reviewed.
    localization.status = ReviewStatus.REVIEWED;

    const saved = await this.localizationRepo.save(localization);

    const campaignId = saved.contentPiece?.campaign?.id;
    if (campaignId) {
      await this.eventsService.publish('content:update', {
        campaignId,
        contentPieceId: saved.contentPiece.id,
        localizationId: saved.id,
        locale: saved.languageCode,
        titleSuggestion: saved.titleSuggestion,
        bodySuggestion: saved.bodySuggestion,
        status: saved.status,
      });
    }

    await this.emitStatusChange(saved);

    return saved;
  }

  private async getByIdOrThrow(id: string): Promise<ContentLocalization> {
    const localization = await this.localizationRepo.findOne({
      where: { id },
      relations: { contentPiece: { campaign: true } },
    });

    if (!localization) {
      throw new NotFoundException(`Content localization with id "${id}" not found`);
    }

    return localization;
  }

  private assertTransition(current: ReviewStatus, next: ReviewStatus): void {
    if (current === next) {
      return;
    }

    const allowed = this.allowedTransitions[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Invalid status transition: ${current} -> ${next}`);
    }
  }

  private async emitStatusChange(localization: ContentLocalization): Promise<void> {
    const campaignId = localization.contentPiece?.campaign?.id;
    if (!campaignId) {
      return;
    }

    await this.eventsService.publish('status:change', {
      campaignId,
      contentPieceId: localization.contentPiece.id,
      localizationId: localization.id,
      locale: localization.languageCode,
      status: localization.status,
    });
  }
}
