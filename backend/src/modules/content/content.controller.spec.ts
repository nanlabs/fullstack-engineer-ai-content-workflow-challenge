import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { TranslationsService } from '../translations/translations.service';
import { ContentStatus, ContentType } from '@prisma/client';
import { UpdateContentDto } from './dto/update-content.dto';
import { GenerateAiContentDto } from './dto/generate-ai-content.dto';
import { RegenerateAiContentDto } from '../ai/dto/regenerate-ai-content.dto';
import { GenerateTranslationDto } from '../translations/dto/generate-translations.dto';

describe('ContentController', () => {
  let controller: ContentController;
  let contentService: ContentService;
  let translationsService: TranslationsService;

  const mockContentService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    generateAiContent: jest.fn(),
    regenerateAiContent: jest.fn(),
    updateContentStatus: jest.fn(),
  };

  const mockTranslationsService = {
    generateTranslationForMyContent: jest.fn(),
    findAllForContent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: mockContentService,
        },
        {
          provide: TranslationsService,
          useValue: mockTranslationsService,
        },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    contentService = module.get<ContentService>(ContentService);
    translationsService = module.get<TranslationsService>(TranslationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all content pieces for user', async () => {
      const user = { id: 'user-uuid' };
      const mockContent = [
        {
          id: 'content-1',
          title: 'Content 1',
          type: ContentType.SOCIAL_POST,
          status: ContentStatus.DRAFT,
          createdById: user.id,
        },
      ];

      mockContentService.findAll.mockResolvedValue(mockContent);

      const result = await controller.findAll(user);

      expect(result).toEqual(mockContent);
      expect(mockContentService.findAll).toHaveBeenCalledWith(user.id, undefined, undefined);
    });

    it('should return filtered content by campaign ID', async () => {
      const user = { id: 'user-uuid' };
      const campaignId = 'campaign-uuid';
      const mockContent = [
        {
          id: 'content-1',
          title: 'Content 1',
          campaignId,
          createdById: user.id,
        },
      ];

      mockContentService.findAll.mockResolvedValue(mockContent);

      const result = await controller.findAll(user, campaignId);

      expect(result).toEqual(mockContent);
      expect(mockContentService.findAll).toHaveBeenCalledWith(user.id, campaignId, undefined);
    });

    it('should return filtered content by status', async () => {
      const user = { id: 'user-uuid' };
      const status = ContentStatus.APPROVED;
      const mockContent = [
        {
          id: 'content-1',
          title: 'Content 1',
          status: ContentStatus.APPROVED,
          createdById: user.id,
        },
      ];

      mockContentService.findAll.mockResolvedValue(mockContent);

      const result = await controller.findAll(user, undefined, status);

      expect(result).toEqual(mockContent);
      expect(mockContentService.findAll).toHaveBeenCalledWith(user.id, undefined, status);
    });

    it('should return filtered content by both campaign ID and status', async () => {
      const user = { id: 'user-uuid' };
      const campaignId = 'campaign-uuid';
      const status = ContentStatus.AI_GENERATED;

      mockContentService.findAll.mockResolvedValue([]);

      await controller.findAll(user, campaignId, status);

      expect(mockContentService.findAll).toHaveBeenCalledWith(user.id, campaignId, status);
    });
  });

  describe('findOne', () => {
    it('should return a content piece by ID', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const mockContent = {
        id: contentId,
        title: 'Test Content',
        createdById: user.id,
        translations: [],
      };

      mockContentService.findOne.mockResolvedValue(mockContent);

      const result = await controller.findOne(contentId, user);

      expect(result).toEqual(mockContent);
      expect(mockContentService.findOne).toHaveBeenCalledWith(contentId, user.id);
    });

    it('should handle NotFoundException from service', async () => {
      const contentId = 'non-existent-uuid';
      const user = { id: 'user-uuid' };

      mockContentService.findOne.mockRejectedValue(new Error('Content not found'));

      await expect(controller.findOne(contentId, user)).rejects.toThrow('Content not found');
    });
  });

  describe('update', () => {
    it('should update a content piece', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const updateContentDto: UpdateContentDto = {
        title: 'Updated Content',
        content: 'Updated content body',
      };

      const mockUpdatedContent = {
        id: contentId,
        title: 'Updated Content',
        content: 'Updated content body',
        createdById: user.id,
      };

      mockContentService.update.mockResolvedValue(mockUpdatedContent);

      const result = await controller.update(contentId, updateContentDto, user);

      expect(result).toEqual(mockUpdatedContent);
      expect(mockContentService.update).toHaveBeenCalledWith(contentId, updateContentDto, user.id);
    });

    it('should handle validation errors', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const updateDto: UpdateContentDto = {
        status: ContentStatus.APPROVED,
      };

      mockContentService.update.mockRejectedValue(new Error('Invalid status transition'));

      await expect(controller.update(contentId, updateDto, user)).rejects.toThrow('Invalid status transition');
    });
  });

  describe('generateAiContent', () => {
    it('should generate AI content successfully', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const generateDto: GenerateAiContentDto = {
        prompt: 'Generate a social media post',
        model: 'gpt-4',
      };

      const mockGeneratedContent = {
        id: contentId,
        title: 'Test Content',
        content: 'AI generated content',
        status: ContentStatus.AI_GENERATED,
        aiGenerated: true,
        createdById: user.id,
      };

      mockContentService.generateAiContent.mockResolvedValue(mockGeneratedContent);

      const result = await controller.generateAiContent(contentId, generateDto, user);

      expect(result).toEqual(mockGeneratedContent);
      expect(mockContentService.generateAiContent).toHaveBeenCalledWith(contentId, generateDto, user.id);
    });

    it('should handle AI service errors', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const generateDto: GenerateAiContentDto = {
        prompt: 'Generate content',
        model: 'gpt-4',
      };

      mockContentService.generateAiContent.mockRejectedValue(new Error('AI service unavailable'));

      await expect(controller.generateAiContent(contentId, generateDto, user)).rejects.toThrow('AI service unavailable');
    });

    it('should handle empty prompts', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const generateDto: GenerateAiContentDto = {
        prompt: '',
        model: 'gpt-4',
      };

      mockContentService.generateAiContent.mockRejectedValue(new Error('Prompt is required'));

      await expect(controller.generateAiContent(contentId, generateDto, user)).rejects.toThrow('Prompt is required');
    });
  });

  describe('regenerateAiContent', () => {
    it('should regenerate AI content with feedback', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const regenerateDto: RegenerateAiContentDto = {
        feedback: 'Make it more engaging',
        keepHistory: true,
        model: 'gpt-4',
      };

      const mockRegeneratedContent = {
        id: contentId,
        title: 'Test Content',
        content: 'Improved AI generated content',
        status: ContentStatus.AI_GENERATED,
        aiGenerated: true,
        createdById: user.id,
      };

      mockContentService.regenerateAiContent.mockResolvedValue(mockRegeneratedContent);

      const result = await controller.regenerateAiContent(contentId, regenerateDto, user);

      expect(result).toEqual(mockRegeneratedContent);
      expect(mockContentService.regenerateAiContent).toHaveBeenCalledWith(contentId, regenerateDto, user.id);
    });

    it('should handle regeneration errors', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const regenerateDto: RegenerateAiContentDto = {
        feedback: 'Improve this',
      };

      mockContentService.regenerateAiContent.mockRejectedValue(new Error('Cannot regenerate non-AI content'));

      await expect(controller.regenerateAiContent(contentId, regenerateDto, user)).rejects.toThrow('Cannot regenerate non-AI content');
    });
  });

  describe('generateTranslationForMyContent', () => {
    it('should generate translations for content', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const generateTranslationDto: GenerateTranslationDto = {
        language: 'Spanish',
        context: 'Marketing email',
      };

      const mockTranslation = {
        id: 'translation-uuid',
        contentPieceId: contentId,
        language: 'Spanish',
        content: 'Contenido traducido',
        status: 'COMPLETED',
      };

      mockTranslationsService.generateTranslationForMyContent.mockResolvedValue(mockTranslation);

      const result = await controller.generateTranslationForMyContent(contentId, generateTranslationDto, user);

      expect(result).toEqual(mockTranslation);
      expect(mockTranslationsService.generateTranslationForMyContent).toHaveBeenCalledWith(contentId, generateTranslationDto, user.id);
    });

    it('should handle translation errors', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const generateTranslationDto: GenerateTranslationDto = {
        language: 'French',
      };

      mockTranslationsService.generateTranslationForMyContent.mockRejectedValue(new Error('Translation service unavailable'));

      await expect(controller.generateTranslationForMyContent(contentId, generateTranslationDto, user)).rejects.toThrow('Translation service unavailable');
    });
  });

  describe('getMyContentTranslations', () => {
    it('should return all translations for content', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const mockTranslations = [
        {
          id: 'translation-1',
          contentPieceId: contentId,
          language: 'Spanish',
          content: 'Contenido en español',
        },
        {
          id: 'translation-2',
          contentPieceId: contentId,
          language: 'French',
          content: 'Contenu en français',
        },
      ];

      mockTranslationsService.findAllForContent.mockResolvedValue(mockTranslations);

      const result = await controller.getMyContentTranslations(contentId, user);

      expect(result).toEqual(mockTranslations);
      expect(mockTranslationsService.findAllForContent).toHaveBeenCalledWith(contentId, user.id);
    });

    it('should return empty array when no translations exist', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };

      mockTranslationsService.findAllForContent.mockResolvedValue([]);

      const result = await controller.getMyContentTranslations(contentId, user);

      expect(result).toEqual([]);
      expect(mockTranslationsService.findAllForContent).toHaveBeenCalledWith(contentId, user.id);
    });
  });

  describe('remove', () => {
    it('should delete a content piece', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const mockDeletedContent = {
        id: contentId,
        title: 'Deleted Content',
        createdById: user.id,
      };

      mockContentService.remove.mockResolvedValue(mockDeletedContent);

      const result = await controller.remove(contentId, user);

      expect(result).toEqual(mockDeletedContent);
      expect(mockContentService.remove).toHaveBeenCalledWith(contentId, user.id);
    });

    it('should handle deletion errors', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };

      mockContentService.remove.mockRejectedValue(new Error('Cannot delete approved content'));

      await expect(controller.remove(contentId, user)).rejects.toThrow('Cannot delete approved content');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle service timeouts', async () => {
      const user = { id: 'user-uuid' };
      mockContentService.findAll.mockRejectedValue(new Error('Request timeout'));

      await expect(controller.findAll(user)).rejects.toThrow('Request timeout');
    });

    it('should handle concurrent AI generation requests', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const generateDto: GenerateAiContentDto = {
        prompt: 'Generate content',
        model: 'gpt-4',
      };

      mockContentService.generateAiContent.mockRejectedValue(new Error('AI generation already in progress'));

      await expect(controller.generateAiContent(contentId, generateDto, user)).rejects.toThrow('AI generation already in progress');
    });

    it('should handle invalid content types for generation', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const generateDto: GenerateAiContentDto = {
        prompt: 'Generate content',
        model: 'gpt-4',
      };

      mockContentService.generateAiContent.mockRejectedValue(new Error('Invalid content type for AI generation'));

      await expect(controller.generateAiContent(contentId, generateDto, user)).rejects.toThrow('Invalid content type for AI generation');
    });
  });

  describe('authorization', () => {
    it('should ensure user can only access own content', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };

      // Mock service to throw forbidden error for other user's content
      mockContentService.findOne.mockRejectedValue(new Error('Forbidden'));

      await expect(controller.findOne(contentId, user)).rejects.toThrow('Forbidden');
      expect(mockContentService.findOne).toHaveBeenCalledWith(contentId, user.id);
    });

    it('should ensure user can only update own content', async () => {
      const contentId = 'content-uuid';
      const user = { id: 'user-uuid' };
      const updateDto: UpdateContentDto = {
        title: 'Updated Title',
      };

      mockContentService.update.mockRejectedValue(new Error('Forbidden'));

      await expect(controller.update(contentId, updateDto, user)).rejects.toThrow('Forbidden');
      expect(mockContentService.update).toHaveBeenCalledWith(contentId, updateDto, user.id);
    });
  });
});
