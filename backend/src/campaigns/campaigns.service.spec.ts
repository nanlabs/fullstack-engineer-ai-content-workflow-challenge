import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../common/prisma.service';

const mockPrisma = {
  campaign: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockEvents = {
  emit: jest.fn(),
};

describe('CampaignsService', () => {
  let service: CampaignsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();

    service = module.get(CampaignsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a campaign', async () => {
      const dto = { name: 'Test', description: 'Desc', targetLanguages: ['en', 'es'] };
      const expected = { id: '1', ...dto, userId: 'user-1', createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.campaign.create.mockResolvedValue(expected);

      const result = await service.create(dto, 'user-1');
      expect(result).toEqual(expected);
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith({ data: { ...dto, userId: 'user-1' } });
    });
  });

  describe('findAll', () => {
    it('returns all campaigns for user with content pieces', async () => {
      const campaigns = [{ id: '1', name: 'Camp 1', userId: 'user-1', contentPieces: [] }];
      mockPrisma.campaign.findMany.mockResolvedValue(campaigns);

      const result = await service.findAll('user-1');
      expect(result).toEqual(campaigns);
    });
  });

  describe('findOne', () => {
    it('returns a campaign by id for the correct user', async () => {
      const campaign = { id: '1', name: 'Test', userId: 'user-1', contentPieces: [] };
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);

      const result = await service.findOne('1', 'user-1');
      expect(result).toEqual(campaign);
    });

    it('throws NotFoundException when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when campaign belongs to different user', async () => {
      const campaign = { id: '1', name: 'Test', userId: 'user-2', contentPieces: [] };
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);
      await expect(service.findOne('1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates and returns the campaign', async () => {
      const existing = { id: '1', name: 'Old', userId: 'user-1' };
      const updated = { id: '1', name: 'New', userId: 'user-1' };
      mockPrisma.campaign.findUnique.mockResolvedValue(existing);
      mockPrisma.campaign.update.mockResolvedValue(updated);

      const result = await service.update('1', { name: 'New' }, 'user-1');
      expect(result).toEqual(updated);
    });

    it('throws when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.update('999', { name: 'X' }, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the campaign', async () => {
      const existing = { id: '1', name: 'Test', userId: 'user-1' };
      mockPrisma.campaign.findUnique.mockResolvedValue(existing);
      mockPrisma.campaign.delete.mockResolvedValue(existing);

      const result = await service.remove('1', 'user-1');
      expect(result).toEqual(existing);
    });

    it('throws when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.remove('999', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
