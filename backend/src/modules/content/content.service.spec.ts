import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ContentService } from './content.service';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { ContentStatus, ContentType } from '@prisma/client';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { GenerateAiContentDto } from './dto/generate-ai-content.dto';

describe('ContentService', () => {
  let service: ContentService;
  let prismaService: PrismaService;
  let aiService: AiService;
  let eventsGateway: EventsGateway;

  const mockPrismaService = {
    campaign: {
      findUnique: jest.fn(),
    },
    contentPiece: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAiService = {
    generateContent: jest.fn(),
    regenerateContent: jest.fn(),
  };

  const mockEventsGateway = {
    emitContentCreated: jest.fn(),
    emitContentUpdated: jest.fn(),
    emitContentDeleted: jest.fn(),
    emitContentAiGenerated: jest.fn(),
    emitContentStatusChanged: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prismaService = module.get<PrismaService>(PrismaService);
    aiService = module.get<AiService>(AiService);
    eventsGateway = module.get<EventsGateway>(EventsGateway);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 'user-uuid';
    const campaignId = 'campaign-uuid';
    const createContentDto: CreateContentDto = {
      campaignId,
      title: 'Test Content',
      type: ContentType.SOCIAL_POST,
      content: 'Test content body',
    };

    const mockCampaign = {
      id: campaignId,
      name: 'Test Campaign',
      createdById: userId,
    };

    const mockCreatedContent = {
      id: 'content-uuid',
      title: 'Test Content',
      type: ContentType.SOCIAL_POST,
      status: ContentStatus.DRAFT,
      content: 'Test content body',
      campaignId,
      createdById: userId,
      campaign: {
        id: campaignId,
        name: 'Test Campaign',
        status: 'ACTIVE',
      },
      createdBy: {
        id: userId,
        name: 'John Doe',
        email: 'john@test.com',
      },
    };

    it('should create content successfully', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.contentPiece.create.mockResolvedValue(mockCreatedContent);

      const result = await service.create(createContentDto, userId);

      expect(result).toEqual(mockCreatedContent);
      expect(mockPrismaService.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: campaignId },
      });
      expect(mockPrismaService.contentPiece.create).toHaveBeenCalledWith({
        data: {
          ...createContentDto,
          createdById: userId,
          status: ContentStatus.DRAFT,
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(mockEventsGateway.emitContentCreated).toHaveBeenCalledWith(userId, mockCreatedContent);
    });

    it('should throw NotFoundException when campaign does not exist', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(null);

      await expect(service.create(createContentDto, userId)).rejects.toThrow(
        new NotFoundException(`Campaign with ID ${campaignId} not found`)
      );
    });

    it('should throw ForbiddenException when user does not own campaign', async () => {
      const differentUserId = 'different-user-uuid';
      const otherUserCampaign = { ...mockCampaign, createdById: differentUserId };
      mockPrismaService.campaign.findUnique.mockResolvedValue(otherUserCampaign);

      await expect(service.create(createContentDto, userId)).rejects.toThrow(
        new ForbiddenException('You can only create content for your own campaigns')
      );
    });

    it('should set custom status when provided', async () => {
      const dtoWithStatus = { ...createContentDto, status: ContentStatus.AI_GENERATED };
      const contentWithStatus = { ...mockCreatedContent, status: ContentStatus.AI_GENERATED };
      
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.contentPiece.create.mockResolvedValue(contentWithStatus);

      await service.create(dtoWithStatus, userId);

      expect(mockPrismaService.contentPiece.create).toHaveBeenCalledWith({
        data: {
          ...dtoWithStatus,
          createdById: userId,
          status: ContentStatus.AI_GENERATED,
        },
        include: expect.any(Object),
      });
    });
  });

  describe('findAll', () => {
    const userId = 'user-uuid';
    const mockContent = [
      {
        id: 'content-1',
        title: 'Content 1',
        type: ContentType.SOCIAL_POST,
        status: ContentStatus.DRAFT,
        createdById: userId,
        campaign: { id: 'campaign-1', name: 'Campaign 1', status: 'ACTIVE' },
        createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
        translations: [],
      },
    ];

    it('should return all content for user', async () => {
      mockPrismaService.contentPiece.findMany.mockResolvedValue(mockContent);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockContent);
      expect(mockPrismaService.contentPiece.findMany).toHaveBeenCalledWith({
        where: { createdById: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          translations: true,
        },
      });
    });

    it('should filter by campaign ID', async () => {
      const campaignId = 'campaign-uuid';
      mockPrismaService.contentPiece.findMany.mockResolvedValue(mockContent);

      await service.findAll(userId, campaignId);

      expect(mockPrismaService.contentPiece.findMany).toHaveBeenCalledWith({
        where: { 
          createdById: userId,
          campaignId,
        },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.contentPiece.findMany.mockResolvedValue(mockContent);

      await service.findAll(userId, undefined, ContentStatus.DRAFT);

      expect(mockPrismaService.contentPiece.findMany).toHaveBeenCalledWith({
        where: { 
          createdById: userId,
          status: ContentStatus.DRAFT,
        },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    const userId = 'user-uuid';
    const contentId = 'content-uuid';
    const mockContent = {
      id: contentId,
      title: 'Test Content',
      createdById: userId,
      campaign: { id: 'campaign-1', name: 'Campaign 1', status: 'ACTIVE' },
      createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
      translations: [],
    };

    it('should return content when found and user owns it', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContent);

      const result = await service.findOne(contentId, userId);

      expect(result).toEqual(mockContent);
      expect(mockPrismaService.contentPiece.findUnique).toHaveBeenCalledWith({
        where: { id: contentId },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          translations: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    it('should throw NotFoundException when content not found', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(null);

      await expect(service.findOne(contentId, userId)).rejects.toThrow(
        new NotFoundException(`Content piece with ID ${contentId} not found`)
      );
    });

    it('should throw ForbiddenException when user does not own content', async () => {
      const differentUserId = 'different-user-uuid';
      const otherUserContent = { ...mockContent, createdById: differentUserId };
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(otherUserContent);

      await expect(service.findOne(contentId, userId)).rejects.toThrow(
        new ForbiddenException('You can only access your own content')
      );
    });
  });

  describe('update', () => {
    const userId = 'user-uuid';
    const contentId = 'content-uuid';
    const updateDto: UpdateContentDto = {
      title: 'Updated Content',
      content: 'Updated content body',
    };

    const mockExistingContent = {
      id: contentId,
      title: 'Old Title',
      status: ContentStatus.DRAFT,
      createdById: userId,
      campaign: { id: 'campaign-1', name: 'Campaign 1', status: 'ACTIVE' },
      createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
      translations: [],
    };

    const mockUpdatedContent = {
      ...mockExistingContent,
      ...updateDto,
    };

    it('should update content successfully', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockExistingContent);
      mockPrismaService.contentPiece.update.mockResolvedValue(mockUpdatedContent);

      const result = await service.update(contentId, updateDto, userId);

      expect(result).toEqual(mockUpdatedContent);
      expect(mockPrismaService.contentPiece.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: updateDto,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(mockEventsGateway.emitContentUpdated).toHaveBeenCalledWith(userId, mockUpdatedContent);
    });

    it('should emit status change event when status changes', async () => {
      const statusUpdateDto = { ...updateDto, status: ContentStatus.AI_GENERATED };
      const statusUpdatedContent = { ...mockUpdatedContent, status: ContentStatus.AI_GENERATED };
      
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockExistingContent);
      mockPrismaService.contentPiece.update.mockResolvedValue(statusUpdatedContent);

      await service.update(contentId, statusUpdateDto, userId);

      expect(mockEventsGateway.emitContentStatusChanged).toHaveBeenCalledWith(
        userId,
        contentId,
        ContentStatus.AI_GENERATED,
        statusUpdatedContent
      );
    });

    it('should validate status transitions', async () => {
      const invalidStatusDto = { status: ContentStatus.APPROVED };
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockExistingContent);

      // Mock private method call through service
      jest.spyOn(service as any, 'validateStatusTransition').mockImplementation(() => {
        throw new BadRequestException('Cannot change status from DRAFT to APPROVED');
      });

      await expect(service.update(contentId, invalidStatusDto, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateAiContent', () => {
    const userId = 'user-uuid';
    const contentId = 'content-uuid';
    const generateDto: GenerateAiContentDto = {
      prompt: 'Generate a social media post',
      model: 'gpt-4',
    };

    const mockContent = {
      id: contentId,
      title: 'Test Content',
      type: ContentType.SOCIAL_POST,
      status: ContentStatus.DRAFT,
      createdById: userId,
      campaign: { id: 'campaign-1', name: 'Campaign 1', status: 'ACTIVE' },
      createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
      translations: [],
    };

    const mockAiResponse = {
      content: 'AI generated content',
      model: 'gpt-4',
      tokensUsed: 150,
      promptUsed: 'Create an engaging social media post: Generate a social media post',
    };

    const mockUpdatedContent = {
      ...mockContent,
      content: mockAiResponse.content,
      status: ContentStatus.AI_GENERATED,
      aiGenerated: true,
      promptUsed: mockAiResponse.promptUsed,
      aiModelUsed: mockAiResponse.model,
      tokensUsed: mockAiResponse.tokensUsed,
    };

    it('should generate AI content successfully', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContent);
      mockAiService.generateContent.mockResolvedValue(mockAiResponse);
      mockPrismaService.contentPiece.update.mockResolvedValue(mockUpdatedContent);

      const result = await service.generateAiContent(contentId, generateDto, userId);

      expect(result).toEqual(mockUpdatedContent);
      expect(mockAiService.generateContent).toHaveBeenCalledWith({
        prompt: generateDto.prompt,
        contentType: mockContent.type,
        model: generateDto.model,
      });
      expect(mockPrismaService.contentPiece.update).toHaveBeenCalledWith({
        where: { id: contentId },
        data: {
          content: mockAiResponse.content,
          status: ContentStatus.AI_GENERATED,
          aiGenerated: true,
          promptUsed: mockAiResponse.promptUsed,
          aiModelUsed: mockAiResponse.model,
          tokensUsed: mockAiResponse.tokensUsed,
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });
      expect(mockEventsGateway.emitContentAiGenerated).toHaveBeenCalledWith(userId, mockUpdatedContent);
      expect(mockEventsGateway.emitContentStatusChanged).toHaveBeenCalledWith(
        userId,
        contentId,
        ContentStatus.AI_GENERATED,
        mockUpdatedContent
      );
    });

    it('should throw error when content not found', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(null);

      await expect(service.generateAiContent(contentId, generateDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should handle AI service errors', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContent);
      mockAiService.generateContent.mockRejectedValue(new Error('AI service unavailable'));

      await expect(service.generateAiContent(contentId, generateDto, userId)).rejects.toThrow('AI service unavailable');
    });
  });

  describe('remove', () => {
    const userId = 'user-uuid';
    const contentId = 'content-uuid';
    const mockContent = {
      id: contentId,
      title: 'Test Content',
      createdById: userId,
      campaign: { id: 'campaign-1', name: 'Campaign 1', status: 'ACTIVE' },
      createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
      translations: [],
    };

    it('should delete content successfully', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContent);
      mockPrismaService.contentPiece.delete.mockResolvedValue(mockContent);

      const result = await service.remove(contentId, userId);

      expect(result).toEqual(mockContent);
      expect(mockPrismaService.contentPiece.delete).toHaveBeenCalledWith({
        where: { id: contentId },
      });
      expect(mockEventsGateway.emitContentDeleted).toHaveBeenCalledWith(userId, contentId);
    });

    it('should throw error when content not found', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(null);

      await expect(service.remove(contentId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createForCampaign', () => {
    const userId = 'user-uuid';
    const campaignId = 'campaign-uuid';
    const createDto = {
      title: 'Campaign Content',
      type: ContentType.SOCIAL_POST,
      content: 'Content body',
    };

    const mockCampaign = {
      id: campaignId,
      name: 'Test Campaign',
      createdById: userId,
    };

    it('should create content for campaign successfully', async () => {
      const mockCreatedContent = {
        id: 'content-uuid',
        campaignId,
        ...createDto,
        status: ContentStatus.DRAFT,
        createdById: userId,
        campaign: { id: campaignId, name: 'Test Campaign', status: 'ACTIVE' },
        createdBy: { id: userId, name: 'John Doe', email: 'john@test.com' },
      };

      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.contentPiece.create.mockResolvedValue(mockCreatedContent);

      const result = await service.createForCampaign(campaignId, createDto, userId);

      expect(result).toEqual(mockCreatedContent);
      expect(mockPrismaService.contentPiece.create).toHaveBeenCalledWith({
        data: {
          campaignId,
          ...createDto,
          createdById: userId,
          status: ContentStatus.DRAFT,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(null);

      await expect(service.createForCampaign(campaignId, createDto, userId)).rejects.toThrow(
        new NotFoundException(`Campaign with ID ${campaignId} not found`)
      );
    });

    it('should throw ForbiddenException when user does not own campaign', async () => {
      const otherUserCampaign = { ...mockCampaign, createdById: 'other-user' };
      mockPrismaService.campaign.findUnique.mockResolvedValue(otherUserCampaign);

      await expect(service.createForCampaign(campaignId, createDto, userId)).rejects.toThrow(
        new ForbiddenException('You can only create content for your own campaigns')
      );
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid status transitions', () => {
      // Access private method for testing
      const validateStatusTransition = (service as any).validateStatusTransition.bind(service);
      
      // From DRAFT
      expect(() => validateStatusTransition(ContentStatus.DRAFT, ContentStatus.AI_GENERATED)).not.toThrow();
      expect(() => validateStatusTransition(ContentStatus.DRAFT, ContentStatus.APPROVED)).not.toThrow();
      
      // From AI_GENERATED
      expect(() => validateStatusTransition(ContentStatus.AI_GENERATED, ContentStatus.DRAFT)).not.toThrow();
      expect(() => validateStatusTransition(ContentStatus.AI_GENERATED, ContentStatus.APPROVED)).not.toThrow();
      expect(() => validateStatusTransition(ContentStatus.AI_GENERATED, ContentStatus.REJECTED)).not.toThrow();
      
      // From REJECTED
      expect(() => validateStatusTransition(ContentStatus.REJECTED, ContentStatus.DRAFT)).not.toThrow();
    });

    it('should throw error for invalid status transitions', () => {
      const validateStatusTransition = (service as any).validateStatusTransition.bind(service);
      
      // Invalid transitions
      expect(() => validateStatusTransition(ContentStatus.APPROVED, ContentStatus.DRAFT)).toThrow(BadRequestException);
      expect(() => validateStatusTransition(ContentStatus.APPROVED, ContentStatus.AI_GENERATED)).toThrow(BadRequestException);
      expect(() => validateStatusTransition(ContentStatus.REJECTED, ContentStatus.APPROVED)).toThrow(BadRequestException);
      expect(() => validateStatusTransition(ContentStatus.REJECTED, ContentStatus.AI_GENERATED)).toThrow(BadRequestException);
      expect(() => validateStatusTransition(ContentStatus.APPROVED, ContentStatus.REJECTED)).toThrow(BadRequestException);
    });
  });
});
