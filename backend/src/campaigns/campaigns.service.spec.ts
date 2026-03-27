import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  campaign: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
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

    service = module.get<CampaignsService>(CampaignsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all campaigns ordered by createdAt desc', async () => {
      const campaigns = [
        { id: '1', name: 'Campaign A', targetLangs: [], _count: { contents: 2 } },
        { id: '2', name: 'Campaign B', targetLangs: [], _count: { contents: 0 } },
      ];
      mockPrisma.campaign.findMany.mockResolvedValue(campaigns);

      const result = await service.findAll();

      expect(result).toEqual(campaigns);
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the campaign when found', async () => {
      const campaign = { id: '1', name: 'Test', contents: [] };
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);

      const result = await service.findOne('1');
      expect(result).toEqual(campaign);
    });

    it('throws NotFoundException when campaign does not exist', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a campaign with the provided data', async () => {
      const dto = { name: 'New Campaign', description: 'desc', targetLangs: ['es'] };
      const created = { id: '1', ...dto, createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.campaign.create.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result).toEqual(created);
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'New Campaign' }) }),
      );
    });
  });

  describe('remove', () => {
    it('deletes the campaign if it exists', async () => {
      const campaign = { id: '1', name: 'To Delete', contents: [] };
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);
      mockPrisma.campaign.delete.mockResolvedValue(campaign);

      await expect(service.remove('1')).resolves.toBeUndefined();
      expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundException when deleting a non-existent campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.remove('ghost')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.campaign.delete).not.toHaveBeenCalled();
    });
  });
});
