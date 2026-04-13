import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';

const mockPrisma = {
  aiDraft: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockGateway = {
  emitToCampaign: jest.fn().mockResolvedValue(undefined),
};

const makeDraft = (reviewState: string) => ({
  id: 'd-1',
  contentPieceId: 'cp-1',
  provider: 'openai',
  model: 'gpt-4o',
  taskType: 'generation',
  generatedText: 'Generated text',
  reviewState,
  contentPiece: { campaignId: 'c-1' },
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    jest.clearAllMocks();
  });

  describe('markReviewed', () => {
    it('should transition ai_suggested → reviewed', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('ai_suggested'));
      mockPrisma.aiDraft.update.mockResolvedValue({ ...makeDraft('reviewed') });

      const result = await service.markReviewed('d-1');
      expect(result.reviewState).toBe('reviewed');
    });

    it('should reject invalid transition draft → reviewed', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('draft'));

      await expect(service.markReviewed('d-1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for missing draft', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(null);

      await expect(service.markReviewed('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should transition reviewed → approved', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('reviewed'));
      mockPrisma.aiDraft.update.mockResolvedValue({ ...makeDraft('approved') });

      const result = await service.approve('d-1');
      expect(result.reviewState).toBe('approved');
    });

    it('should accept editedText', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('reviewed'));
      mockPrisma.aiDraft.update.mockResolvedValue({
        ...makeDraft('approved'),
        editedText: 'Edited',
      });

      await service.approve('d-1', 'Edited');

      expect(mockPrisma.aiDraft.update).toHaveBeenCalledWith({
        where: { id: 'd-1' },
        data: { reviewState: 'approved', editedText: 'Edited' },
      });
    });

    it('should reject invalid transition ai_suggested → approved', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('ai_suggested'));

      await expect(service.approve('d-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('reject', () => {
    it('should transition reviewed → rejected', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('reviewed'));
      mockPrisma.aiDraft.update.mockResolvedValue({ ...makeDraft('rejected') });

      const result = await service.reject('d-1', 'Not on brand');
      expect(result.reviewState).toBe('rejected');
    });

    it('should reject invalid transition draft → rejected', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('draft'));

      await expect(service.reject('d-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('reset', () => {
    it('should transition rejected → draft', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('rejected'));
      mockPrisma.aiDraft.update.mockResolvedValue({ ...makeDraft('draft') });

      const result = await service.reset('d-1');
      expect(result.reviewState).toBe('draft');
    });

    it('should reject invalid transition approved → draft', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('approved'));

      await expect(service.reset('d-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('bulkApprove', () => {
    it('should approve multiple valid drafts', async () => {
      mockPrisma.aiDraft.findUnique.mockResolvedValue(makeDraft('reviewed'));
      mockPrisma.aiDraft.update.mockResolvedValue({ ...makeDraft('approved') });

      const results = await service.bulkApprove(['d-1', 'd-2']);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should report failures for invalid transitions', async () => {
      mockPrisma.aiDraft.findUnique
        .mockResolvedValueOnce(makeDraft('reviewed'))
        .mockResolvedValueOnce(makeDraft('draft'));
      mockPrisma.aiDraft.update.mockResolvedValue({ ...makeDraft('approved') });

      const results = await service.bulkApprove(['d-1', 'd-2']);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Invalid state transition');
    });
  });
});
