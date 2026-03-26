import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentService } from './content.service';
import { PrismaService } from '../common/prisma.service';

const mockPrisma = {
  campaign: {
    findUnique: jest.fn(),
  },
  contentPiece: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockEvents = {
  emit: jest.fn(),
};

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();

    service = module.get(ContentService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a content piece and emits event', async () => {
      const campaign = { id: 'camp-1', userId: 'user-1' };
      const piece = { id: '1', title: 'Test', body: '', language: 'en', status: 'DRAFT' };
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);
      mockPrisma.contentPiece.create.mockResolvedValue(piece);

      const result = await service.create('camp-1', { title: 'Test' }, 'user-1');
      expect(result).toEqual(piece);
      expect(mockEvents.emit).toHaveBeenCalledWith('content.created', { ...piece, userId: 'user-1' });
    });

    it('throws NotFoundException when campaign not owned by user', async () => {
      const campaign = { id: 'camp-1', userId: 'user-2' };
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);

      await expect(service.create('camp-1', { title: 'Test' }, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('returns a content piece with translations', async () => {
      const piece = { id: '1', translations: [], campaign: { userId: 'user-1' } };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);

      const result = await service.findOne('1', 'user-1');
      expect(result).toEqual(piece);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when content belongs to different user', async () => {
      const piece = { id: '1', translations: [], campaign: { userId: 'user-2' } };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);
      await expect(service.findOne('1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('validates and updates status', async () => {
      const piece = { id: '1', status: 'AI_SUGGESTED', reviewNotes: null, campaign: { userId: 'user-1' } };
      const updated = { ...piece, status: 'APPROVED' };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);
      mockPrisma.contentPiece.update.mockResolvedValue(updated);

      const result = await service.updateStatus('1', { status: 'APPROVED' as any }, 'user-1');
      expect(result.status).toBe('APPROVED');
      expect(mockEvents.emit).toHaveBeenCalledWith('content.statusChanged', { ...updated, userId: 'user-1' });
    });

    it('rejects invalid status transition', async () => {
      const piece = { id: '1', status: 'DRAFT', reviewNotes: null, campaign: { userId: 'user-1' } };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);

      await expect(
        service.updateStatus('1', { status: 'DRAFT' as any }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes the content piece', async () => {
      const piece = { id: '1', campaign: { userId: 'user-1' } };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);
      mockPrisma.contentPiece.delete.mockResolvedValue(piece);

      const result = await service.remove('1', 'user-1');
      expect(result).toEqual(piece);
    });
  });
});
