import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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

describe('CampaignsService', () => {
  let service: CampaignsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CampaignsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a campaign', async () => {
      const dto = { name: 'Test', description: 'Desc', targetLanguages: ['en', 'es'] };
      const expected = { id: '1', ...dto, createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.campaign.create.mockResolvedValue(expected);

      const result = await service.create(dto);
      expect(result).toEqual(expected);
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('findAll', () => {
    it('returns all campaigns with content pieces', async () => {
      const campaigns = [{ id: '1', name: 'Camp 1', contentPieces: [] }];
      mockPrisma.campaign.findMany.mockResolvedValue(campaigns);

      const result = await service.findAll();
      expect(result).toEqual(campaigns);
    });
  });

  describe('findOne', () => {
    it('returns a campaign by id', async () => {
      const campaign = { id: '1', name: 'Test', contentPieces: [] };
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);

      const result = await service.findOne('1');
      expect(result).toEqual(campaign);
    });

    it('throws NotFoundException when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates and returns the campaign', async () => {
      const existing = { id: '1', name: 'Old' };
      const updated = { id: '1', name: 'New' };
      mockPrisma.campaign.findUnique.mockResolvedValue(existing);
      mockPrisma.campaign.update.mockResolvedValue(updated);

      const result = await service.update('1', { name: 'New' });
      expect(result).toEqual(updated);
    });

    it('throws when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.update('999', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the campaign', async () => {
      const existing = { id: '1', name: 'Test' };
      mockPrisma.campaign.findUnique.mockResolvedValue(existing);
      mockPrisma.campaign.delete.mockResolvedValue(existing);

      const result = await service.remove('1');
      expect(result).toEqual(existing);
    });

    it('throws when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
