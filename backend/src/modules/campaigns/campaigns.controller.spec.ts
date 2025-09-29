import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { ContentService } from '../content/content.service';
import { CampaignStatus } from '@prisma/client';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateContentForCampaignDto } from '../content/dto/create-content-for-campaign.dto';

describe('CampaignsController', () => {
  let controller: CampaignsController;
  let campaignsService: CampaignsService;
  let contentService: ContentService;

  const mockCampaignsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockContentService = {
    createForCampaign: jest.fn(),
    findAllForCampaign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignsController],
      providers: [
        {
          provide: CampaignsService,
          useValue: mockCampaignsService,
        },
        {
          provide: ContentService,
          useValue: mockContentService,
        },
      ],
    }).compile();

    controller = module.get<CampaignsController>(CampaignsController);
    campaignsService = module.get<CampaignsService>(CampaignsService);
    contentService = module.get<ContentService>(ContentService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a campaign', async () => {
      const createCampaignDto: CreateCampaignDto = {
        name: 'Test Campaign',
        description: 'A test campaign',
        status: CampaignStatus.DRAFT,
      };

      const user = { id: 'user-uuid' };
      const mockResult = {
        id: 'campaign-uuid',
        name: 'Test Campaign',
        description: 'A test campaign',
        status: CampaignStatus.DRAFT,
        createdById: user.id,
      };

      mockCampaignsService.create.mockResolvedValue(mockResult);

      const result = await controller.create(createCampaignDto, user);

      expect(result).toEqual(mockResult);
      expect(mockCampaignsService.create).toHaveBeenCalledWith(createCampaignDto, user.id);
    });

    it('should handle service errors', async () => {
      const createCampaignDto: CreateCampaignDto = {
        name: 'Test Campaign',
      };

      const user = { id: 'user-uuid' };
      mockCampaignsService.create.mockRejectedValue(new Error('Service error'));

      await expect(controller.create(createCampaignDto, user)).rejects.toThrow('Service error');
    });
  });

  describe('findAll', () => {
    it('should return all campaigns for user', async () => {
      const user = { id: 'user-uuid' };
      const mockCampaigns = [
        {
          id: 'campaign-1',
          name: 'Campaign 1',
          status: CampaignStatus.ACTIVE,
          createdById: user.id,
        },
      ];

      mockCampaignsService.findAll.mockResolvedValue(mockCampaigns);

      const result = await controller.findAll(user);

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignsService.findAll).toHaveBeenCalledWith(user.id, undefined);
    });

    it('should return filtered campaigns by status', async () => {
      const user = { id: 'user-uuid' };
      const status = CampaignStatus.ACTIVE;
      const mockCampaigns = [
        {
          id: 'campaign-1',
          name: 'Campaign 1',
          status: CampaignStatus.ACTIVE,
          createdById: user.id,
        },
      ];

      mockCampaignsService.findAll.mockResolvedValue(mockCampaigns);

      const result = await controller.findAll(user, status);

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignsService.findAll).toHaveBeenCalledWith(user.id, status);
    });
  });

  describe('findOne', () => {
    it('should return a campaign by ID', async () => {
      const campaignId = 'campaign-uuid';
      const user = { id: 'user-uuid' };
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        createdById: user.id,
        contentPieces: [],
      };

      mockCampaignsService.findOne.mockResolvedValue(mockCampaign);

      const result = await controller.findOne(campaignId, user);

      expect(result).toEqual(mockCampaign);
      expect(mockCampaignsService.findOne).toHaveBeenCalledWith(campaignId, user.id);
    });

    it('should handle NotFoundException from service', async () => {
      const campaignId = 'non-existent-uuid';
      const user = { id: 'user-uuid' };

      mockCampaignsService.findOne.mockRejectedValue(new Error('Campaign not found'));

      await expect(controller.findOne(campaignId, user)).rejects.toThrow('Campaign not found');
    });
  });

  describe('update', () => {
    it('should update a campaign', async () => {
      const campaignId = 'campaign-uuid';
      const user = { id: 'user-uuid' };
      const updateCampaignDto: UpdateCampaignDto = {
        name: 'Updated Campaign',
        status: CampaignStatus.ACTIVE,
      };

      const mockUpdatedCampaign = {
        id: campaignId,
        name: 'Updated Campaign',
        status: CampaignStatus.ACTIVE,
        createdById: user.id,
      };

      mockCampaignsService.update.mockResolvedValue(mockUpdatedCampaign);

      const result = await controller.update(campaignId, updateCampaignDto, user);

      expect(result).toEqual(mockUpdatedCampaign);
      expect(mockCampaignsService.update).toHaveBeenCalledWith(campaignId, updateCampaignDto, user.id);
    });
  });

  describe('remove', () => {
    it('should delete a campaign', async () => {
      const campaignId = 'campaign-uuid';
      const user = { id: 'user-uuid' };
      const mockDeletedCampaign = {
        id: campaignId,
        name: 'Deleted Campaign',
        createdById: user.id,
      };

      mockCampaignsService.remove.mockResolvedValue(mockDeletedCampaign);

      const result = await controller.remove(campaignId, user);

      expect(result).toEqual(mockDeletedCampaign);
      expect(mockCampaignsService.remove).toHaveBeenCalledWith(campaignId, user.id);
    });
  });

  describe('createContent', () => {
    it('should create content for a campaign', async () => {
      const campaignId = 'campaign-uuid';
      const user = { id: 'user-uuid' };
      const createContentDto: CreateContentForCampaignDto = {
        title: 'Test Content',
        type: 'SOCIAL_POST' as any,
        content: 'Test content body',
      };

      const mockCreatedContent = {
        id: 'content-uuid',
        title: 'Test Content',
        type: 'SOCIAL_POST',
        content: 'Test content body',
        campaignId,
        createdById: user.id,
      };

      mockContentService.createForCampaign.mockResolvedValue(mockCreatedContent);

      const result = await controller.createContent(campaignId, createContentDto, user);

      expect(result).toEqual(mockCreatedContent);
      expect(mockContentService.createForCampaign).toHaveBeenCalledWith(campaignId, createContentDto, user.id);
    });
  });

  describe('getCampaignContent', () => {
    it('should return all content for a campaign', async () => {
      const campaignId = 'campaign-uuid';
      const user = { id: 'user-uuid' };
      const mockContent = [
        {
          id: 'content-1',
          title: 'Content 1',
          campaignId,
          createdById: user.id,
        },
        {
          id: 'content-2',
          title: 'Content 2',
          campaignId,
          createdById: user.id,
        },
      ];

      mockContentService.findAllForCampaign.mockResolvedValue(mockContent);

      const result = await controller.getCampaignContent(campaignId, user);

      expect(result).toEqual(mockContent);
      expect(mockContentService.findAllForCampaign).toHaveBeenCalledWith(campaignId, user.id);
    });

    it('should handle empty content array', async () => {
      const campaignId = 'campaign-uuid';
      const user = { id: 'user-uuid' };

      mockContentService.findAllForCampaign.mockResolvedValue([]);

      const result = await controller.getCampaignContent(campaignId, user);

      expect(result).toEqual([]);
      expect(mockContentService.findAllForCampaign).toHaveBeenCalledWith(campaignId, user.id);
    });
  });

  describe('error handling', () => {
    it('should propagate service errors in create', async () => {
      const createCampaignDto: CreateCampaignDto = {
        name: 'Test Campaign',
      };
      const user = { id: 'user-uuid' };

      mockCampaignsService.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.create(createCampaignDto, user)).rejects.toThrow('Database connection failed');
    });

    it('should propagate service errors in findAll', async () => {
      const user = { id: 'user-uuid' };

      mockCampaignsService.findAll.mockRejectedValue(new Error('Query timeout'));

      await expect(controller.findAll(user)).rejects.toThrow('Query timeout');
    });

    it('should propagate service errors in update', async () => {
      const campaignId = 'campaign-uuid';
      const updateDto: UpdateCampaignDto = { name: 'Updated' };
      const user = { id: 'user-uuid' };

      mockCampaignsService.update.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.update(campaignId, updateDto, user)).rejects.toThrow('Validation failed');
    });

    it('should propagate service errors in remove', async () => {
      const campaignId = 'campaign-uuid';
      const user = { id: 'user-uuid' };

      mockCampaignsService.remove.mockRejectedValue(new Error('Cannot delete campaign with content'));

      await expect(controller.remove(campaignId, user)).rejects.toThrow('Cannot delete campaign with content');
    });
  });

  describe('parameter validation', () => {
    it('should validate UUID parameters', async () => {
      // This would be handled by NestJS validation pipes in practice
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const user = { id: 'user-uuid' };

      mockCampaignsService.findOne.mockResolvedValue({ id: validUuid });

      await controller.findOne(validUuid, user);

      expect(mockCampaignsService.findOne).toHaveBeenCalledWith(validUuid, user.id);
    });
  });
});
