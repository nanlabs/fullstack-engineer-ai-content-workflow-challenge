import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContentService } from './content.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  campaign: { count: jest.fn() },
  contentPiece: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a content piece under a campaign', async () => {
      mockPrisma.campaign.count.mockResolvedValue(1);
      const expected = { id: 'cp-1', type: 'headline', campaignId: 'c-1' };
      mockPrisma.contentPiece.create.mockResolvedValue(expected);

      const result = await service.create('c-1', {
        type: 'headline' as never,
        originalText: 'Test',
      });

      expect(result.id).toBe('cp-1');
    });

    it('should throw NotFoundException if campaign missing', async () => {
      mockPrisma.campaign.count.mockResolvedValue(0);

      await expect(
        service.create('missing', { type: 'headline' as never }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return content piece with drafts', async () => {
      const piece = { id: 'cp-1', aiDrafts: [], campaign: {} };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);

      const result = await service.findOne('cp-1');

      expect(result).toEqual(piece);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update content piece fields', async () => {
      mockPrisma.contentPiece.count.mockResolvedValue(1);
      mockPrisma.contentPiece.update.mockResolvedValue({
        id: 'cp-1',
        originalText: 'Updated',
      });

      const result = await service.update('cp-1', { originalText: 'Updated' });

      expect(result.originalText).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete content piece', async () => {
      mockPrisma.contentPiece.count.mockResolvedValue(1);
      mockPrisma.contentPiece.delete.mockResolvedValue({ id: 'cp-1' });

      const result = await service.remove('cp-1');

      expect(result.id).toBe('cp-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.contentPiece.count.mockResolvedValue(0);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
