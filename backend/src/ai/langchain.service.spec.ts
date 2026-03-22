import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LangchainService } from './langchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { AIModel } from '@prisma/client';

const mockPrisma = {
  contentPiece: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  aIDraft: {
    create: jest.fn(),
  },
  translation: {
    create: jest.fn(),
  },
};

const mockEventsGateway = {
  emitDraftGenerated: jest.fn(),
  emitTranslationCreated: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'ANTHROPIC_API_KEY') return 'test-anthropic-key';
    if (key === 'OPENAI_API_KEY') return 'test-openai-key';
    return undefined;
  }),
};

describe('LangchainService', () => {
  let service: LangchainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangchainService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<LangchainService>(LangchainService);
    jest.clearAllMocks();
  });

  describe('runChain', () => {
    it('throws NotFoundException when content piece does not exist', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(null);

      await expect(
        service.runChain('non-existent-id', 'Spanish', AIModel.CLAUDE_3_5_SONNET),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.contentPiece.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        include: { campaign: true },
      });
    });

    it('creates draft, translation and returns summary on success', async () => {
      const contentPiece = {
        id: 'content-1',
        campaignId: 'campaign-1',
        originalText: 'Buy our product today',
        type: 'HEADLINE',
        status: 'DRAFT',
        campaign: { id: 'campaign-1' },
      };

      mockPrisma.contentPiece.findUnique.mockResolvedValue(contentPiece);

      const mockDraft = { id: 'draft-1', contentPieceId: 'content-1', generatedText: 'mock draft' };
      const mockTranslation = { id: 'translation-1', contentPieceId: 'content-1', translatedText: 'mock translation' };

      mockPrisma.aIDraft.create.mockResolvedValue(mockDraft);
      mockPrisma.translation.create.mockResolvedValue(mockTranslation);
      mockPrisma.contentPiece.update.mockResolvedValue({ ...contentPiece, status: 'AI_SUGGESTED' });

      // Override buildLlm to return a mock LLM
      const mockLlmResponse = { content: 'mocked AI response' };
      const mockLlm = { invoke: jest.fn().mockResolvedValue(mockLlmResponse) };
      jest.spyOn(service as any, 'buildLlm').mockReturnValue(mockLlm);

      const result = await service.runChain('content-1', 'Spanish', AIModel.CLAUDE_3_5_SONNET);

      expect(result).toMatchObject({
        draft: mockDraft,
        translation: mockTranslation,
        targetLanguage: 'Spanish',
      });
      expect(result.summary).toBeDefined();
      expect(mockPrisma.aIDraft.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.translation.create).toHaveBeenCalledTimes(1);
      expect(mockEventsGateway.emitDraftGenerated).toHaveBeenCalledWith('campaign-1', mockDraft);
      expect(mockEventsGateway.emitTranslationCreated).toHaveBeenCalledWith('campaign-1', mockTranslation);
    });
  });
});
