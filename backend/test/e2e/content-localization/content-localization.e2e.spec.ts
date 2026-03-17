import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { EventsService } from '../../../src/events/events.service';
import { ReviewStatus } from '../../../src/status-enum';
import { ContentLocalization } from '../../../src/content-localization/content-localizations.entity';
import { ContentLocalizationController } from '../../../src/content-localization/content-localization.controller';
import { ContentLocalizationService } from '../../../src/content-localization/content-localization.service';

describe('ContentLocalizationController (e2e)', () => {
  let app: INestApplication;

  let localizationStore: ContentLocalization;

  const localizationRepo = {
    findOne: jest.fn(async ({ where }: { where: { id: string } }) => {
      if (where.id !== localizationStore.id) {
        return null;
      }
      return localizationStore;
    }),
    save: jest.fn(async (entity: ContentLocalization) => {
      localizationStore = {
        ...localizationStore,
        ...entity,
        updatedAt: new Date(),
      };
      return localizationStore;
    }),
  };

  const eventsService = {
    publish: jest.fn(),
  };

  const resetLocalization = (status: ReviewStatus) => {
    localizationStore = {
      id: 'loc-1',
      languageCode: 'en-US',
      titleSuggestion: 'Initial title',
      bodySuggestion: 'Initial body',
      status,
      aiMetadata: null,
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      contentPiece: {
        id: 'piece-1',
        name: 'Social post',
        type: 'SOCIAL',
        campaign: {
          id: 'campaign-1',
          topic: 'Topic',
          description: null,
          languages: ['en-US'],
          llmProvider: 'openai',
          model: 'gpt-4o-mini',
          pieces: [],
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
        localizations: [],
      },
    } as ContentLocalization;
  };

  beforeAll(async () => {
    resetLocalization(ReviewStatus.AI_SUGGESTED);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ContentLocalizationController],
      providers: [
        ContentLocalizationService,
        {
          provide: getRepositoryToken(ContentLocalization),
          useValue: localizationRepo,
        },
        {
          provide: EventsService,
          useValue: eventsService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH /content-localizations/:id/content updates content and sets REVIEWED', async () => {
    resetLocalization(ReviewStatus.AI_SUGGESTED);

    const response = await request(app.getHttpServer())
      .patch('/content-localizations/loc-1/content')
      .send({
        titleSuggestion: 'Updated title',
        bodySuggestion: 'Updated body',
      })
      .expect(200);

    expect(response.body.id).toBe('loc-1');
    expect(response.body.status).toBe(ReviewStatus.REVIEWED);
    expect(response.body.titleSuggestion).toBe('Updated title');
    expect(response.body.bodySuggestion).toBe('Updated body');
    expect(eventsService.publish).toHaveBeenCalled();
  });

  it('PATCH /content-localizations/:id/status rejects invalid transitions', async () => {
    resetLocalization(ReviewStatus.REVIEWED);

    const response = await request(app.getHttpServer())
      .patch('/content-localizations/loc-1/status')
      .send({ status: ReviewStatus.DRAFT })
      .expect(400);

    expect(response.body.message).toContain('Invalid status transition');
  });

  it('PATCH /content-localizations/:id/status validates enum values', async () => {
    resetLocalization(ReviewStatus.AI_SUGGESTED);

    await request(app.getHttpServer())
      .patch('/content-localizations/loc-1/status')
      .send({ status: 'DONE' })
      .expect(400);
  });
});
