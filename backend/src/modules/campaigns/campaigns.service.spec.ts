import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { CampaignStatus } from '@prisma/client';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prismaService: PrismaService;
  let eventsGateway: EventsGateway;

  const mockPrismaService = {
    campaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockEventsGateway = {
    emitCampaignCreated: jest.fn(),
    emitCampaignUpdated: jest.fn(),
    emitCampaignDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    prismaService = module.get<PrismaService>(PrismaService);
    eventsGateway = module.get<EventsGateway>(EventsGateway);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 'user-uuid';
    const createCampaignDto: CreateCampaignDto = {
      name: 'Test Campaign',
      description: 'A test campaign',
      status: CampaignStatus.DRAFT,
    };

    const mockCreatedCampaign = {
      id: 'campaign-uuid',
      name: 'Test Campaign',
      description: 'A test campaign',
      status: CampaignStatus.DRAFT,
      createdById: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        id: userId,
        name: 'John Doe',
        email: 'john@test.com',
      },
    };

    it('should create a campaign successfully', async () => {
      mockPrismaService.campaign.create.mockResolvedValue(mockCreatedCampaign);

      const result = await service.create(createCampaignDto, userId);

      expect(result).toEqual(mockCreatedCampaign);
      expect(mockPrismaService.campaign.create).toHaveBeenCalledWith({
        data: {
          ...createCampaignDto,
          createdById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(mockEventsGateway.emitCampaignCreated).toHaveBeenCalledWith(userId, mockCreatedCampaign);
    });

    it('should create campaign with minimal data', async () => {
      const minimalDto = { name: 'Minimal Campaign' };
      const minimalCampaign = { ...mockCreatedCampaign, ...minimalDto };
      
      mockPrismaService.campaign.create.mockResolvedValue(minimalCampaign);

      const result = await service.create(minimalDto, userId);

      expect(result).toEqual(minimalCampaign);
      expect(mockPrismaService.campaign.create).toHaveBeenCalledWith({
        data: {
          ...minimalDto,
          createdById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });
  });

  describe('findAll', () => {
    const userId = 'user-uuid';
    const mockCampaigns = [
      {
        id: 'campaign-1',
        name: 'Campaign 1',
        status: CampaignStatus.ACTIVE,
        createdById: userId,
        createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
        contentPieces: [
          { id: 'content-1', title: 'Content 1', type: 'SOCIAL_POST', status: 'DRAFT', language: 'en' }
        ],
      },
      {
        id: 'campaign-2',
        name: 'Campaign 2',
        status: CampaignStatus.DRAFT,
        createdById: userId,
        createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
        contentPieces: [],
      },
    ];

    it('should return all campaigns for user', async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue(mockCampaigns);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockCampaigns);
      expect(mockPrismaService.campaign.findMany).toHaveBeenCalledWith({
        where: {
          createdById: userId,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contentPieces: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              language: true,
            },
          },
        },
      });
    });

    it('should filter campaigns by status', async () => {
      const filteredCampaigns = [mockCampaigns[0]];
      mockPrismaService.campaign.findMany.mockResolvedValue(filteredCampaigns);

      const result = await service.findAll(userId, CampaignStatus.ACTIVE);

      expect(result).toEqual(filteredCampaigns);
      expect(mockPrismaService.campaign.findMany).toHaveBeenCalledWith({
        where: {
          createdById: userId,
          status: CampaignStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contentPieces: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              language: true,
            },
          },
        },
      });
    });

    it('should return empty array when user has no campaigns', async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const userId = 'user-uuid';
    const campaignId = 'campaign-uuid';
    const mockCampaign = {
      id: campaignId,
      name: 'Test Campaign',
      createdById: userId,
      createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
      contentPieces: [
        {
          id: 'content-1',
          title: 'Content 1',
          translations: [],
        },
      ],
    };

    it('should return campaign when found and user owns it', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);

      const result = await service.findOne(campaignId, userId);

      expect(result).toEqual(mockCampaign);
      expect(mockPrismaService.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: campaignId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contentPieces: {
            include: {
              translations: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(null);

      await expect(service.findOne(campaignId, userId)).rejects.toThrow(
        new NotFoundException(`Campaign with ID ${campaignId} not found`)
      );
    });

    it('should throw ForbiddenException when user does not own campaign', async () => {
      const differentUserId = 'different-user-uuid';
      const otherUserCampaign = { ...mockCampaign, createdById: differentUserId };
      mockPrismaService.campaign.findUnique.mockResolvedValue(otherUserCampaign);

      await expect(service.findOne(campaignId, userId)).rejects.toThrow(
        new ForbiddenException('You can only access your own campaigns')
      );
    });
  });

  describe('update', () => {
    const userId = 'user-uuid';
    const campaignId = 'campaign-uuid';
    const updateDto: UpdateCampaignDto = {
      name: 'Updated Campaign',
      status: CampaignStatus.ACTIVE,
    };

    const mockExistingCampaign = {
      id: campaignId,
      name: 'Old Campaign',
      createdById: userId,
      createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
      contentPieces: [],
    };

    const mockUpdatedCampaign = {
      ...mockExistingCampaign,
      ...updateDto,
    };

    it('should update campaign successfully', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockExistingCampaign);
      mockPrismaService.campaign.update.mockResolvedValue(mockUpdatedCampaign);

      const result = await service.update(campaignId, updateDto, userId);

      expect(result).toEqual(mockUpdatedCampaign);
      expect(mockPrismaService.campaign.update).toHaveBeenCalledWith({
        where: { id: campaignId },
        data: updateDto,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(mockEventsGateway.emitCampaignUpdated).toHaveBeenCalledWith(userId, mockUpdatedCampaign);
    });

    it('should throw error when campaign not found', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(null);

      await expect(service.update(campaignId, updateDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when user does not own campaign', async () => {
      const differentUserId = 'different-user-uuid';
      const otherUserCampaign = { ...mockExistingCampaign, createdById: differentUserId };
      mockPrismaService.campaign.findUnique.mockResolvedValue(otherUserCampaign);

      await expect(service.update(campaignId, updateDto, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const userId = 'user-uuid';
    const campaignId = 'campaign-uuid';
    const mockCampaign = {
      id: campaignId,
      name: 'Test Campaign',
      createdById: userId,
      createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
      contentPieces: [],
    };

    it('should delete campaign successfully', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.campaign.delete.mockResolvedValue(mockCampaign);

      const result = await service.remove(campaignId, userId);

      expect(result).toEqual(mockCampaign);
      expect(mockPrismaService.campaign.delete).toHaveBeenCalledWith({
        where: { id: campaignId },
      });
      expect(mockEventsGateway.emitCampaignDeleted).toHaveBeenCalledWith(userId, campaignId);
    });

    it('should throw error when campaign not found', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(null);

      await expect(service.remove(campaignId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when user does not own campaign', async () => {
      const differentUserId = 'different-user-uuid';
      const otherUserCampaign = { ...mockCampaign, createdById: differentUserId };
      mockPrismaService.campaign.findUnique.mockResolvedValue(otherUserCampaign);

      await expect(service.remove(campaignId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
});
