import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentService } from './content.service';
import { PrismaService } from '../common/prisma.service';

const mockPrisma = {
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
      const piece = { id: '1', type: 'HEADLINE', title: 'Test', body: '', language: 'en', status: 'DRAFT' };
      mockPrisma.contentPiece.create.mockResolvedValue(piece);

      const result = await service.create('camp-1', { type: 'HEADLINE' as any, title: 'Test' });
      expect(result).toEqual(piece);
      expect(mockEvents.emit).toHaveBeenCalledWith('content.created', piece);
    });
  });

  describe('findOne', () => {
    it('returns a content piece with translations', async () => {
      const piece = { id: '1', translations: [], campaign: {} };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);

      const result = await service.findOne('1');
      expect(result).toEqual(piece);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.contentPiece.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('validates and updates status', async () => {
      const piece = { id: '1', status: 'AI_SUGGESTED', reviewNotes: null };
      const updated = { ...piece, status: 'APPROVED' };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);
      mockPrisma.contentPiece.update.mockResolvedValue(updated);

      const result = await service.updateStatus('1', { status: 'APPROVED' as any });
      expect(result.status).toBe('APPROVED');
      expect(mockEvents.emit).toHaveBeenCalledWith('content.statusChanged', updated);
    });

    it('rejects invalid status transition', async () => {
      const piece = { id: '1', status: 'DRAFT', reviewNotes: null };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);

      await expect(
        service.updateStatus('1', { status: 'APPROVED' as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes the content piece', async () => {
      const piece = { id: '1' };
      mockPrisma.contentPiece.findUnique.mockResolvedValue(piece);
      mockPrisma.contentPiece.delete.mockResolvedValue(piece);

      const result = await service.remove('1');
      expect(result).toEqual(piece);
    });
  });
});
