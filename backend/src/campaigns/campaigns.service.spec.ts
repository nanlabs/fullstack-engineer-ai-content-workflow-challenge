import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  campaign: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
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

  describe('create', () => {
    it('should create a campaign with defaults', async () => {
      const dto = { name: 'Test Campaign' };
      const expected = { id: 'uuid-1', ...dto, targetLanguages: [], sourceLanguage: 'en' };
      mockPrisma.campaign.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Campaign',
          description: undefined,
          targetLanguages: [],
          sourceLanguage: 'en',
        },
      });
    });

    it('should create a campaign with custom languages', async () => {
      const dto = {
        name: 'Intl Campaign',
        description: 'A campaign',
        targetLanguages: ['es', 'fr'],
        sourceLanguage: 'en',
      };
      mockPrisma.campaign.create.mockResolvedValue({ id: 'uuid-2', ...dto });

      const result = await service.create(dto);

      expect(result.targetLanguages).toEqual(['es', 'fr']);
    });
  });

  describe('findAll', () => {
    it('should return paginated campaigns', async () => {
      const campaigns = [{ id: 'uuid-1', name: 'Test' }];
      mockPrisma.campaign.findMany.mockResolvedValue(campaigns);
      mockPrisma.campaign.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toEqual(campaigns);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply status filter', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.campaign.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, status: 'active' as never });

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        }),
      );
    });

    it('should apply search filter', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.campaign.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'summer' });

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'summer', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a campaign with content pieces', async () => {
      const campaign = { id: 'uuid-1', name: 'Test', contentPieces: [] };
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(campaign);
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update campaign fields', async () => {
      mockPrisma.campaign.count.mockResolvedValue(1);
      mockPrisma.campaign.update.mockResolvedValue({ id: 'uuid-1', name: 'Updated' });

      const result = await service.update('uuid-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException on missing campaign', async () => {
      mockPrisma.campaign.count.mockResolvedValue(0);

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft-delete by archiving', async () => {
      mockPrisma.campaign.count.mockResolvedValue(1);
      mockPrisma.campaign.update.mockResolvedValue({ id: 'uuid-1', status: 'archived' });

      const result = await service.remove('uuid-1');

      expect(result.status).toBe('archived');
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { status: 'archived' },
      });
    });
  });
});
