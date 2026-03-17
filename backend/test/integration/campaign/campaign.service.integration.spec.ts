import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Campaign } from '../../../src/campaign/campaign.entity';
import { CampaignService } from '../../../src/campaign/campaign.service';
import { ContentPiece } from '../../../src/content-piece/content-pieces.entity';
import { AiService } from '../../../src/ai/ai.service';

describe('CampaignService (integration)', () => {
  let service: CampaignService;

  const campaignRepo = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const contentPieceRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const aiService = {
    generateCampaignContent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        {
          provide: getRepositoryToken(Campaign),
          useValue: campaignRepo,
        },
        {
          provide: getRepositoryToken(ContentPiece),
          useValue: contentPieceRepo,
        },
        {
          provide: AiService,
          useValue: aiService,
        },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  it('normalizes locales and calls AI generation on campaign creation', async () => {
    jest.useFakeTimers();

    campaignRepo.save.mockResolvedValue({
      id: 'campaign-1',
      topic: 'Summer skincare',
      description: 'Global campaign',
      languages: ['en-US', 'fr-FR'],
      llmProvider: 'openai',
      model: 'gpt-4o-mini',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    const created = await service.createCampaign({
      topic: 'Summer skincare',
      description: 'Global campaign',
      languages: ['en-us', 'fr-fr'],
      provider: 'openai',
      model: 'gpt-4o-mini',
    });

    expect(campaignRepo.save).toHaveBeenCalledWith({
      topic: 'Summer skincare',
      description: 'Global campaign',
      languages: ['en-US', 'fr-FR'],
      llmProvider: 'openai',
      model: 'gpt-4o-mini',
    });
    jest.advanceTimersByTime(500);
    await Promise.resolve();
    expect(aiService.generateCampaignContent).toHaveBeenCalledWith(created, ['en-US', 'fr-FR']);
    expect(created.languages).toEqual(['en-US', 'fr-FR']);
    jest.useRealTimers();
  });

  it('returns dashboard-safe summary without full suggestion bodies', async () => {
    campaignRepo.find.mockResolvedValue([
      {
        id: 'campaign-2',
        topic: 'Holiday promos',
        description: null,
        languages: ['en-US'],
        llmProvider: 'openai',
        model: 'gpt-4o-mini',
        createdAt: new Date('2026-03-02T00:00:00.000Z'),
        pieces: [
          {
            id: 'piece-1',
            name: 'Email Hero',
            type: 'EMAIL',
            localizations: [
              {
                id: 'loc-1',
                languageCode: 'en-US',
                status: 'AI_SUGGESTED',
                titleSuggestion: 'Very long AI title',
                bodySuggestion: 'Very long AI body',
                updatedAt: new Date('2026-03-02T01:00:00.000Z'),
              },
            ],
          },
        ],
      },
    ]);

    const result = await service.getCampaigns();
    const localization = (result[0].pieces as any[])[0].localizations[0];

    expect(localization.id).toBe('loc-1');
    expect(localization.languageCode).toBe('en-US');
    expect(localization.status).toBe('AI_SUGGESTED');
    expect(localization.updatedAt).toBeDefined();
    expect(localization.titleSuggestion).toBeUndefined();
    expect(localization.bodySuggestion).toBeUndefined();
  });
});
