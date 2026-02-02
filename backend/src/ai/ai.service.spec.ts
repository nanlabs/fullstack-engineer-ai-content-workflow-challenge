import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import OpenAI from 'openai';
import { Repository } from 'typeorm';
import { ContentPiece } from '../content/content-piece.entity';
import { ReviewState } from '../content/review-state.enum';
import { ContentEventsGateway } from '../websocket/content-events.gateway';
import { AiService } from './ai.service';
import { ReviewDecision } from './review-decision.enum';

jest.mock('openai');

const mockContent: ContentPiece = {
  id: 'content-1',
  campaignId: 'campaign-1',
  campaign: null,
  type: 'blog',
  title: 'Launch Post',
  originalText: 'Original copy',
  aiDraft: null,
  translations: null,
  reviewState: ReviewState.Draft,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const saveMock = jest.fn();
const findOneMock = jest.fn();

const mockResponses = {
  create: jest.fn(),
};

const OpenAIMock = OpenAI as jest.MockedClass<typeof OpenAI>;

OpenAIMock.mockImplementation(() =>
  ({
    responses: mockResponses,
  }) as unknown as OpenAI,
);

describe('AiService', () => {
  let service: AiService;
  let repository: Repository<ContentPiece>;

  beforeEach(async () => {
    saveMock.mockReset();
    findOneMock.mockReset();
    mockResponses.create.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: () => 'test-key',
          },
        },
        {
          provide: getRepositoryToken(ContentPiece),
          useValue: {
            findOne: findOneMock,
            save: saveMock,
          },
        },
        {
          provide: ContentEventsGateway,
          useValue: {
            emitContentCreated: jest.fn(),
            emitContentUpdated: jest.fn(),
            emitContentDeleted: jest.fn(),
            emitAiDraftGenerated: jest.fn(),
            emitReviewStateChanged: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AiService);
    repository = moduleRef.get(getRepositoryToken(ContentPiece));
  });

  it('generates an AI draft and updates review state', async () => {
    findOneMock.mockResolvedValue({ ...mockContent });
    saveMock.mockImplementation(async (value) => value);
    mockResponses.create.mockResolvedValue({
      output_text: 'AI draft response',
    });

    const result = await service.generateDraft('content-1', {
      instructions: 'Keep it short',
      tone: 'Friendly',
    });

    expect(mockResponses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
      }),
    );
    expect(result.aiDraft).toBe('AI draft response');
    expect(result.reviewState).toBe(ReviewState.AiSuggested);
    expect(repository.save).toHaveBeenCalled();
  });

  it('submits review edits with feedback', async () => {
    findOneMock.mockResolvedValue({ ...mockContent, aiDraft: 'AI draft' });
    saveMock.mockImplementation(async (value) => value);

    const result = await service.submitReview('content-1', {
      decision: ReviewDecision.Edit,
      editedText: 'Edited draft',
      feedback: 'Needs more energy',
    });

    expect(result.aiDraft).toBe('Edited draft');
    expect(result.reviewState).toBe(ReviewState.InReview);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        reviewFeedback: 'Needs more energy',
      }),
    );
  });
});
