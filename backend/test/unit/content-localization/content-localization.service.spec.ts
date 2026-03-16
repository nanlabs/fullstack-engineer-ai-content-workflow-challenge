import { BadRequestException } from '@nestjs/common';
import { ContentLocalizationService } from '../../../src/content-localization/content-localization.service';
import { ReviewStatus } from '../../../src/status-enum';

type MockRepo = {
  findOne: jest.Mock;
  save: jest.Mock;
};

type MockEventsService = {
  publish: jest.Mock;
};

function createLocalization(status: ReviewStatus) {
  return {
    id: 'loc-1',
    languageCode: 'en-US',
    titleSuggestion: 'Old title',
    bodySuggestion: 'Old body',
    status,
    contentPiece: {
      id: 'piece-1',
      campaign: { id: 'campaign-1' },
    },
  };
}

describe('ContentLocalizationService', () => {
  let service: ContentLocalizationService;
  let repo: MockRepo;
  let eventsService: MockEventsService;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    eventsService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    service = new ContentLocalizationService(repo as never, eventsService as never);
  });

  it('allows valid status transition and publishes status:change', async () => {
    const localization = createLocalization(ReviewStatus.AI_SUGGESTED);
    repo.findOne.mockResolvedValue(localization);
    repo.save.mockImplementation(async (value: unknown) => value);

    const saved = await service.updateStatus('loc-1', { status: ReviewStatus.REVIEWED });

    expect(saved.status).toBe(ReviewStatus.REVIEWED);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(eventsService.publish).toHaveBeenCalledWith('status:change', {
      campaignId: 'campaign-1',
      contentPieceId: 'piece-1',
      localizationId: 'loc-1',
      locale: 'en-US',
      status: ReviewStatus.REVIEWED,
    });
  });

  it('rejects invalid status transition', async () => {
    repo.findOne.mockResolvedValue(createLocalization(ReviewStatus.AI_SUGGESTED));

    await expect(
      service.updateStatus('loc-1', { status: ReviewStatus.APPROVED }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repo.save).not.toHaveBeenCalled();
    expect(eventsService.publish).not.toHaveBeenCalled();
  });

  it('updates content, sets REVIEWED status, and publishes both events', async () => {
    repo.findOne.mockResolvedValue(createLocalization(ReviewStatus.AI_SUGGESTED));
    repo.save.mockImplementation(async (value: unknown) => value);

    const saved = await service.updateContent('loc-1', {
      titleSuggestion: 'New title',
      bodySuggestion: 'New body',
    });

    expect(saved.titleSuggestion).toBe('New title');
    expect(saved.bodySuggestion).toBe('New body');
    expect(saved.status).toBe(ReviewStatus.REVIEWED);

    expect(eventsService.publish).toHaveBeenCalledWith('content:update', {
      campaignId: 'campaign-1',
      contentPieceId: 'piece-1',
      localizationId: 'loc-1',
      locale: 'en-US',
      titleSuggestion: 'New title',
      bodySuggestion: 'New body',
      status: ReviewStatus.REVIEWED,
    });
    expect(eventsService.publish).toHaveBeenCalledWith('status:change', {
      campaignId: 'campaign-1',
      contentPieceId: 'piece-1',
      localizationId: 'loc-1',
      locale: 'en-US',
      status: ReviewStatus.REVIEWED,
    });
  });

  it('blocks content edits for finalized statuses', async () => {
    repo.findOne.mockResolvedValue(createLocalization(ReviewStatus.APPROVED));

    await expect(
      service.updateContent('loc-1', {
        bodySuggestion: 'Attempted edit',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repo.save).not.toHaveBeenCalled();
    expect(eventsService.publish).not.toHaveBeenCalled();
  });
});
