import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';

/**
 * E2E smoke-tests for the Campaigns REST API.
 *
 * These tests require a running PostgreSQL instance configured via DATABASE_URL.
 * For CI, ensure the test database is seeded and migrations have been applied.
 */
describe('CampaignsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/campaigns', () => {
    it('should return 200 and an array', async () => {
      const response = await app
        .getHttpAdapter()
        .getInstance()
        .inject({
          method: 'GET',
          url: '/api/campaigns',
        });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('POST /api/campaigns', () => {
    it('should create a campaign and return 201', async () => {
      const payload = {
        name: 'E2E Test Campaign',
        description: 'Created during e2e tests',
        targetLangs: ['en', 'es'],
      };

      const response = await app
        .getHttpAdapter()
        .getInstance()
        .inject({
          method: 'POST',
          url: '/api/campaigns',
          payload,
        });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body.name).toBe(payload.name);
      expect(body.targetLangs).toEqual(expect.arrayContaining(['en', 'es']));
    });

    it('should return 400 when name is missing', async () => {
      const response = await app
        .getHttpAdapter()
        .getInstance()
        .inject({
          method: 'POST',
          url: '/api/campaigns',
          payload: { description: 'No name' },
        });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/campaigns/:id', () => {
    it('should return 404 for a non-existent campaign', async () => {
      const response = await app
        .getHttpAdapter()
        .getInstance()
        .inject({
          method: 'GET',
          url: '/api/campaigns/00000000-0000-0000-0000-000000000000',
        });

      expect(response.statusCode).toBe(404);
    });
  });
});
