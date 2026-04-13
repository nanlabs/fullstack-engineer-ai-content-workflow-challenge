import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

const mockModel = {
  invoke: jest.fn(),
  pipe: jest.fn().mockReturnThis(),
  batch: jest.fn(),
  stream: jest.fn(),
  getName: jest.fn().mockReturnValue('mock-model'),
  bindTools: jest.fn(),
};

const contentPieceWithCampaign = {
  id: 'cp-1',
  campaignId: 'c-1',
  type: 'headline',
  originalText: 'Original headline text',
  language: 'en',
  metadata: null,
  campaign: {
    id: 'c-1',
    name: 'Test Campaign',
    description: 'A test campaign',
    targetLanguages: ['es', 'fr'],
    sourceLanguage: 'en',
  },
};

const mockPrisma = {
  contentPiece: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  aiDraft: {
    create: jest.fn(),
  },
};

const mockOpenAi = {
  getModel: jest.fn(),
  getModelName: jest.fn().mockReturnValue('gpt-4o'),
  getProviderName: jest.fn().mockReturnValue('openai'),
  isAvailable: jest.fn().mockReturnValue(true),
};

const mockAnthropic = {
  getModel: jest.fn(),
  getModelName: jest.fn().mockReturnValue('claude-sonnet-4-20250514'),
  getProviderName: jest.fn().mockReturnValue('anthropic'),
  isAvailable: jest.fn().mockReturnValue(true),
};

jest.mock('./chains/generation.chain', () => ({
  buildGenerationChain: () => ({
    invoke: jest.fn().mockResolvedValue('Generated headline content'),
  }),
}));

jest.mock('./chains/translation.chain', () => ({
  buildTranslationChain: () => ({
    invoke: jest.fn().mockResolvedValue('Texto traducido'),
  }),
}));

jest.mock('./chains/extraction.chain', () => ({
  buildExtractionChain: () => ({
    invoke: jest.fn().mockResolvedValue({
      keywords: ['eco', 'sustainable'],
      tone: 'professional',
      sentiment: 0.8,
      summary: 'Eco-friendly product line.',
    }),
  }),
}));

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OpenAiProvider, useValue: mockOpenAi },
        { provide: AnthropicProvider, useValue: mockAnthropic },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    jest.clearAllMocks();

    mockOpenAi.getModel.mockReturnValue(mockModel);
    mockAnthropic.getModel.mockReturnValue(mockModel);
  });

  describe('generate', () => {
    it('should generate a draft with a single provider', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(contentPieceWithCampaign);
      mockPrisma.aiDraft.create.mockResolvedValue({
        id: 'd-1',
        generatedText: 'Generated headline content',
        provider: 'openai',
        reviewState: 'ai_suggested',
      });

      const result = await service.generate('cp-1', 'openai');

      expect(result).toHaveLength(1);
      expect(result[0].reviewState).toBe('ai_suggested');
      expect(mockPrisma.aiDraft.create).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for missing content piece', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(null);

      await expect(service.generate('missing', 'openai')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when provider is not configured', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(contentPieceWithCampaign);
      mockOpenAi.getModel.mockReturnValue(null);

      await expect(service.generate('cp-1', 'openai')).rejects.toThrow(BadRequestException);
    });
  });

  describe('translate', () => {
    it('should create drafts for each target language', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(contentPieceWithCampaign);
      mockPrisma.aiDraft.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `d-${data.targetLanguage}`, ...data }),
      );

      const result = await service.translate('cp-1', ['es', 'fr'], 'openai');

      expect(result).toHaveLength(2);
    });

    it('should throw BadRequestException when no text to translate', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue({
        ...contentPieceWithCampaign,
        originalText: null,
      });

      await expect(service.translate('cp-1', ['es'], 'openai')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('extract', () => {
    it('should extract metadata and update content piece', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(contentPieceWithCampaign);
      mockPrisma.contentPiece.update.mockResolvedValue({});

      const result = await service.extract('cp-1', 'openai');

      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('tone');
      expect(result).toHaveProperty('sentiment');
      expect(mockPrisma.contentPiece.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no text to analyze', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue({
        ...contentPieceWithCampaign,
        originalText: null,
      });

      await expect(service.extract('cp-1')).rejects.toThrow(BadRequestException);
    });
  });
});
