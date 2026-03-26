import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentStatus } from '@prisma/client';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ContentWorkflow } from './content-workflow';
import { ContentService } from '../content/content.service';
import { ModelFactory } from './model-factory.service';
import { PrismaService } from '../common/prisma.service';

const mockAiService = {
  generateDraft: jest.fn(),
  translate: jest.fn(),
  extractMetadata: jest.fn(),
  compare: jest.fn(),
};

const mockContentWorkflow = {
  runFullPipeline: jest.fn(),
};

const mockContentService = {
  findOne: jest.fn(),
};

const mockModelFactory = {
  getModel: jest.fn(),
  getAvailableProviders: jest.fn().mockReturnValue(['gpt-5.4-mini']),
  getDefaultProvider: jest.fn().mockReturnValue('gpt-5.4-mini'),
  getAllProviders: jest.fn().mockReturnValue(['gpt-5.4-mini', 'claude-sonnet-4.6']),
};

const mockPrisma = {
  contentPiece: {
    update: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockEvents = {
  emit: jest.fn(),
};

const mockReq = { user: { id: 'user-1' } };

const mockPiece = {
  id: 'piece-1',
  title: 'Test Title',
  body: 'Test body',
  language: 'en',
  campaignId: 'camp-1',
  campaign: {
    id: 'camp-1',
    name: 'Test Campaign',
    description: 'Test desc',
    targetLanguages: ['en', 'es'],
  },
};

describe('AiController', () => {
  let controller: AiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: AiService, useValue: mockAiService },
        { provide: ContentWorkflow, useValue: mockContentWorkflow },
        { provide: ContentService, useValue: mockContentService },
        { provide: ModelFactory, useValue: mockModelFactory },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();

    controller = module.get(AiController);
    jest.clearAllMocks();
    mockContentService.findOne.mockResolvedValue(mockPiece);
  });

  describe('getProviders', () => {
    it('returns all, available, and default providers', () => {
      const result = controller.getProviders();

      expect(result).toEqual({
        all: ['gpt-5.4-mini', 'claude-sonnet-4.6'],
        available: ['gpt-5.4-mini'],
        default: 'gpt-5.4-mini',
      });
    });
  });

  describe('generate', () => {
    it('generates content and updates piece', async () => {
      mockAiService.generateDraft.mockResolvedValue('Generated body');
      const updated = { ...mockPiece, body: 'Generated body', status: ContentStatus.AI_SUGGESTED };
      mockPrisma.contentPiece.update.mockResolvedValue(updated);

      const result = await controller.generate('piece-1', {}, mockReq);

      expect(mockContentService.findOne).toHaveBeenCalledWith('piece-1', 'user-1');
      expect(mockAiService.generateDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignName: 'Test Campaign',
          title: 'Test Title',
          language: 'en',
        }),
      );
      expect(mockPrisma.contentPiece.update).toHaveBeenCalledWith({
        where: { id: 'piece-1' },
        data: {
          body: 'Generated body',
          status: ContentStatus.AI_SUGGESTED,
          aiModel: 'gpt-5.4-mini',
        },
      });
      expect(mockEvents.emit).toHaveBeenCalledWith(
        'content.aiGenerated',
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result).toEqual(updated);
    });

    it('uses specified model when provided', async () => {
      mockAiService.generateDraft.mockResolvedValue('Body');
      mockPrisma.contentPiece.update.mockResolvedValue({});

      await controller.generate('piece-1', { model: 'claude-sonnet-4.6' }, mockReq);

      expect(mockAiService.generateDraft).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'claude-sonnet-4.6' }),
      );
      expect(mockPrisma.contentPiece.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ aiModel: 'claude-sonnet-4.6' }),
        }),
      );
    });

    it('wraps AI errors as 502 by default', async () => {
      mockAiService.generateDraft.mockRejectedValue(new Error('Model failed'));

      await expect(
        controller.generate('piece-1', {}, mockReq),
      ).rejects.toThrow(HttpException);

      try {
        await controller.generate('piece-1', {}, mockReq);
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      }
    });

    it('wraps rate limit errors as 429', async () => {
      mockAiService.generateDraft.mockRejectedValue(
        new Error('Error 429: Rate limit exceeded'),
      );

      try {
        await controller.generate('piece-1', {}, mockReq);
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('wraps quota errors as 429', async () => {
      mockAiService.generateDraft.mockRejectedValue(
        new Error('Your quota has been exceeded'),
      );

      try {
        await controller.generate('piece-1', {}, mockReq);
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });
  });

  describe('translate', () => {
    it('creates a new translation piece when none exists', async () => {
      mockAiService.translate.mockResolvedValue({ title: 'Título', body: 'Cuerpo' });
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      const created = { id: 'trans-1', title: 'Título', body: 'Cuerpo', language: 'es' };
      mockPrisma.contentPiece.create.mockResolvedValue(created);

      const result = await controller.translate(
        'piece-1',
        { targetLanguage: 'es' },
        mockReq,
      );

      expect(mockPrisma.contentPiece.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          campaignId: 'camp-1',
          title: 'Título',
          body: 'Cuerpo',
          language: 'es',
          status: ContentStatus.AI_SUGGESTED,
          parentId: 'piece-1',
        }),
      });
      expect(result).toEqual(created);
    });

    it('updates existing translation when one exists', async () => {
      mockAiService.translate.mockResolvedValue({ title: 'Título v2', body: 'Cuerpo v2' });
      mockPrisma.contentPiece.findFirst.mockResolvedValue({
        id: 'existing-trans',
        language: 'es',
      });
      const updated = { id: 'existing-trans', title: 'Título v2', body: 'Cuerpo v2' };
      mockPrisma.contentPiece.update.mockResolvedValue(updated);

      const result = await controller.translate(
        'piece-1',
        { targetLanguage: 'es' },
        mockReq,
      );

      expect(mockPrisma.contentPiece.update).toHaveBeenCalledWith({
        where: { id: 'existing-trans' },
        data: expect.objectContaining({
          title: 'Título v2',
          body: 'Cuerpo v2',
          status: ContentStatus.AI_SUGGESTED,
        }),
      });
      expect(result).toEqual(updated);
    });

    it('emits content.translated event', async () => {
      mockAiService.translate.mockResolvedValue({ title: 'T', body: 'B' });
      mockPrisma.contentPiece.findFirst.mockResolvedValue(null);
      mockPrisma.contentPiece.create.mockResolvedValue({ id: 'trans-1' });

      await controller.translate('piece-1', { targetLanguage: 'es' }, mockReq);

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'content.translated',
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });

  describe('extract', () => {
    it('extracts metadata and updates piece', async () => {
      const metadata = {
        keywords: ['test'],
        tone: 'professional',
        sentiment: 'positive',
        readability: 'moderate',
      };
      mockAiService.extractMetadata.mockResolvedValue(metadata);
      const updated = { ...mockPiece, metadata };
      mockPrisma.contentPiece.update.mockResolvedValue(updated);

      const result = await controller.extract('piece-1', {}, mockReq);

      expect(mockPrisma.contentPiece.update).toHaveBeenCalledWith({
        where: { id: 'piece-1' },
        data: { metadata },
      });
      expect(mockEvents.emit).toHaveBeenCalledWith(
        'content.metadataExtracted',
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result).toEqual(updated);
    });
  });

  describe('chain', () => {
    it('runs full pipeline and creates translation pieces', async () => {
      mockContentWorkflow.runFullPipeline.mockResolvedValue({
        generatedBody: 'Generated',
        translations: { es: { title: 'Título', body: 'Cuerpo' } },
        metadata: { keywords: ['test'] },
      });
      const updatedPiece = { id: 'piece-1', body: 'Generated' };
      mockPrisma.contentPiece.update.mockResolvedValue(updatedPiece);
      mockPrisma.contentPiece.create.mockResolvedValue({ id: 'trans-1', language: 'es' });

      const result = await controller.chain('piece-1', {}, mockReq);

      expect(mockContentWorkflow.runFullPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignName: 'Test Campaign',
          title: 'Test Title',
          language: 'en',
          targetLanguages: ['en', 'es'],
        }),
      );
      expect(mockPrisma.contentPiece.update).toHaveBeenCalled();
      expect(mockPrisma.contentPiece.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          language: 'es',
          title: 'Título',
          body: 'Cuerpo',
          status: ContentStatus.AI_SUGGESTED,
          parentId: 'piece-1',
        }),
      });
      expect(mockEvents.emit).toHaveBeenCalledWith(
        'content.chainCompleted',
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });

  describe('compare', () => {
    it('returns comparison results', async () => {
      const comparisons = { 'gpt-5.4-mini': 'OpenAI result', 'claude-sonnet-4.6': 'Anthropic result' };
      mockAiService.compare.mockResolvedValue(comparisons);

      const result = await controller.compare(
        'piece-1',
        { models: ['gpt-5.4-mini', 'claude-sonnet-4.6'] },
        mockReq,
      );

      expect(result).toEqual({ contentId: 'piece-1', comparisons });
      expect(mockAiService.compare).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignName: 'Test Campaign',
          title: 'Test Title',
        }),
        ['gpt-5.4-mini', 'claude-sonnet-4.6'],
      );
    });

    it('wraps AI errors in compare', async () => {
      mockAiService.compare.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        controller.compare('piece-1', {}, mockReq),
      ).rejects.toThrow(HttpException);
    });
  });
});
