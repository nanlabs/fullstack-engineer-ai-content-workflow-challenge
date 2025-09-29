import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TranslationsService } from './translations.service';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { TranslationStatus, ContentStatus } from '@prisma/client';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { GenerateTranslationDto } from './dto/generate-translations.dto';

describe('TranslationsService', () => {
  let service: TranslationsService;
  let prismaService: PrismaService;
  let aiService: AiService;

  const mockPrismaService = {
    contentPiece: {
      findUnique: jest.fn(),
    },
    translation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAiService = {
    translateContent: jest.fn(),
    regenerateTranslation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<TranslationsService>(TranslationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    aiService = module.get<AiService>(AiService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const contentPieceId = 'content-uuid';
    const createTranslationDto: CreateTranslationDto = {
      contentPieceId,
      language: 'Spanish',
      content: 'Contenido traducido',
    };

    const mockContentPiece = {
      id: contentPieceId,
      title: 'Test Content',
      type: 'SOCIAL_POST',
      content: 'Original content',
    };

    const mockCreatedTranslation = {
      id: 'translation-uuid',
      contentPieceId,
      language: 'Spanish',
      content: 'Contenido traducido',
      status: TranslationStatus.PENDING,
      contentPiece: {
        id: contentPieceId,
        title: 'Test Content',
        type: 'SOCIAL_POST',
        content: 'Original content',
      },
    };

    it('should create translation successfully', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContentPiece);
      mockPrismaService.translation.findUnique.mockResolvedValue(null);
      mockPrismaService.translation.create.mockResolvedValue(mockCreatedTranslation);

      const result = await service.create(createTranslationDto);

      expect(result).toEqual(mockCreatedTranslation);
      expect(mockPrismaService.contentPiece.findUnique).toHaveBeenCalledWith({
        where: { id: contentPieceId },
      });
      expect(mockPrismaService.translation.findUnique).toHaveBeenCalledWith({
        where: {
          contentPieceId_language: {
            contentPieceId,
            language: 'Spanish',
          },
        },
      });
      expect(mockPrismaService.translation.create).toHaveBeenCalledWith({
        data: {
          ...createTranslationDto,
          status: TranslationStatus.PENDING,
        },
        include: {
          contentPiece: {
            select: {
              id: true,
              title: true,
              type: true,
              content: true,
            },
          },
        },
      });
    });

    it('should set custom status when provided', async () => {
      const dtoWithStatus = { ...createTranslationDto, status: TranslationStatus.COMPLETED };
      const translationWithStatus = { ...mockCreatedTranslation, status: TranslationStatus.COMPLETED };
      
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContentPiece);
      mockPrismaService.translation.findUnique.mockResolvedValue(null);
      mockPrismaService.translation.create.mockResolvedValue(translationWithStatus);

      await service.create(dtoWithStatus);

      expect(mockPrismaService.translation.create).toHaveBeenCalledWith({
        data: {
          ...dtoWithStatus,
          status: TranslationStatus.COMPLETED,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when content piece does not exist', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(null);

      await expect(service.create(createTranslationDto)).rejects.toThrow(
        new NotFoundException(`Content piece with ID ${contentPieceId} not found`)
      );
    });

    it('should throw BadRequestException when translation already exists for language', async () => {
      const existingTranslation = {
        id: 'existing-translation',
        contentPieceId,
        language: 'Spanish',
      };

      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContentPiece);
      mockPrismaService.translation.findUnique.mockResolvedValue(existingTranslation);

      await expect(service.create(createTranslationDto)).rejects.toThrow(
        new BadRequestException("Translation already exists for language 'Spanish'")
      );
    });
  });

  describe('createForMyContent', () => {
    const userId = 'user-uuid';
    const contentPieceId = 'content-uuid';
    const createDto = {
      language: 'French',
      content: 'Contenu traduit',
    };

    const mockContentPiece = {
      id: contentPieceId,
      createdById: userId,
    };

    it('should create translation for user\'s content', async () => {
      const mockCreatedTranslation = {
        id: 'translation-uuid',
        contentPieceId,
        language: 'French',
        content: 'Contenu traduit',
        status: TranslationStatus.PENDING,
        contentPiece: {
          id: contentPieceId,
          title: 'Test Content',
          type: 'SOCIAL_POST',
          content: 'Original content',
        },
      };

      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContentPiece);
      mockPrismaService.translation.findUnique.mockResolvedValue(null);
      mockPrismaService.translation.create.mockResolvedValue(mockCreatedTranslation);

      const result = await service.createForMyContent(contentPieceId, createDto, userId);

      expect(result).toEqual(mockCreatedTranslation);
      expect(mockPrismaService.contentPiece.findUnique).toHaveBeenCalledWith({
        where: { id: contentPieceId },
        select: { createdById: true },
      });
    });

    it('should throw ForbiddenException when user does not own content', async () => {
      const otherUserContent = { id: contentPieceId, createdById: 'other-user' };
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(otherUserContent);

      await expect(service.createForMyContent(contentPieceId, createDto, userId)).rejects.toThrow(
        new ForbiddenException('You can only create translations for your own content')
      );
    });
  });

  describe('findAll', () => {
    const mockTranslations = [
      {
        id: 'translation-1',
        language: 'Spanish',
        status: TranslationStatus.COMPLETED,
        contentPiece: {
          id: 'content-1',
          title: 'Content 1',
          type: 'SOCIAL_POST',
          content: 'Original content',
        },
      },
    ];

    it('should return all translations', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue(mockTranslations);

      const result = await service.findAll();

      expect(result).toEqual(mockTranslations);
      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        include: {
          contentPiece: {
            select: {
              id: true,
              title: true,
              type: true,
              content: true,
            },
          },
        },
      });
    });

    it('should filter by content piece ID', async () => {
      const contentPieceId = 'content-uuid';
      mockPrismaService.translation.findMany.mockResolvedValue(mockTranslations);

      await service.findAll(contentPieceId);

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith({
        where: { contentPieceId },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by language', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue(mockTranslations);

      await service.findAll(undefined, 'Spanish');

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith({
        where: { language: 'Spanish' },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue(mockTranslations);

      await service.findAll(undefined, undefined, TranslationStatus.COMPLETED);

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith({
        where: { status: TranslationStatus.COMPLETED },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    const translationId = 'translation-uuid';
    const mockTranslation = {
      id: translationId,
      language: 'Spanish',
      content: 'Contenido traducido',
      contentPiece: {
        id: 'content-uuid',
        title: 'Test Content',
        type: 'SOCIAL_POST',
        content: 'Original content',
        campaign: {
          id: 'campaign-uuid',
          name: 'Test Campaign',
        },
      },
    };

    it('should return translation when found', async () => {
      mockPrismaService.translation.findUnique.mockResolvedValue(mockTranslation);

      const result = await service.findOne(translationId);

      expect(result).toEqual(mockTranslation);
      expect(mockPrismaService.translation.findUnique).toHaveBeenCalledWith({
        where: { id: translationId },
        include: {
          contentPiece: {
            select: {
              id: true,
              title: true,
              type: true,
              content: true,
              campaign: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    it('should throw NotFoundException when translation not found', async () => {
      mockPrismaService.translation.findUnique.mockResolvedValue(null);

      await expect(service.findOne(translationId)).rejects.toThrow(
        new NotFoundException(`Translation with ID ${translationId} not found`)
      );
    });
  });

  describe('generateTranslation', () => {
    const contentPieceId = 'content-uuid';
    const generateDto: GenerateTranslationDto = {
      language: 'French',
      context: 'Marketing email',
      aiModelUsed: 'gpt-4',
    };

    const mockContentPiece = {
      id: contentPieceId,
      title: 'Test Content',
      content: 'Hello world',
    };

    const mockAiResponse = {
      content: 'Bonjour le monde',
      model: 'gpt-4',
      tokensUsed: 50,
      promptUsed: 'Translate to French: Hello world',
    };

    const mockCreatedTranslation = {
      id: 'translation-uuid',
      contentPieceId,
      language: 'French',
      content: 'Bonjour le monde',
      status: TranslationStatus.COMPLETED,
      aiModelUsed: 'gpt-4',
      tokensUsed: 50,
      contentPiece: {
        id: contentPieceId,
        title: 'Test Content',
        type: 'SOCIAL_POST',
        content: 'Hello world',
      },
    };

    it('should generate new translation when none exists', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContentPiece);
      mockPrismaService.translation.findUnique.mockResolvedValue(null);
      mockAiService.translateContent.mockResolvedValue(mockAiResponse);
      mockPrismaService.translation.create.mockResolvedValue(mockCreatedTranslation);

      const result = await service.generateTranslation(contentPieceId, generateDto);

      expect(result).toEqual(mockCreatedTranslation);
      expect(mockAiService.translateContent).toHaveBeenCalledWith({
        content: mockContentPiece.content,
        targetLanguage: generateDto.language,
        context: generateDto.context,
        model: generateDto.aiModelUsed,
      });
      expect(mockPrismaService.translation.create).toHaveBeenCalledWith({
        data: {
          contentPieceId,
          language: generateDto.language,
          content: mockAiResponse.content,
          status: TranslationStatus.COMPLETED,
          aiModelUsed: mockAiResponse.model,
          tokensUsed: mockAiResponse.tokensUsed,
        },
        include: expect.any(Object),
      });
    });

    it('should update existing translation', async () => {
      const existingTranslation = {
        id: 'existing-translation',
        contentPieceId,
        language: 'French',
        content: 'Old translation',
        status: TranslationStatus.PENDING,
      };

      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContentPiece);
      mockPrismaService.translation.findUnique.mockResolvedValue(existingTranslation);
      mockAiService.translateContent.mockResolvedValue(mockAiResponse);
      mockPrismaService.translation.update.mockResolvedValue(mockCreatedTranslation);

      const result = await service.generateTranslation(contentPieceId, generateDto);

      expect(result).toEqual(mockCreatedTranslation);
      expect(mockPrismaService.translation.update).toHaveBeenCalledWith({
        where: { id: existingTranslation.id },
        data: {
          content: mockAiResponse.content,
          status: TranslationStatus.COMPLETED,
          aiModelUsed: mockAiResponse.model,
          tokensUsed: mockAiResponse.tokensUsed,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when content piece not found', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(null);

      await expect(service.generateTranslation(contentPieceId, generateDto)).rejects.toThrow(
        new NotFoundException(`Content piece with ID ${contentPieceId} not found`)
      );
    });

    it('should throw BadRequestException when content piece has no content', async () => {
      const contentWithoutText = { ...mockContentPiece, content: null };
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(contentWithoutText);

      await expect(service.generateTranslation(contentPieceId, generateDto)).rejects.toThrow(
        new BadRequestException('Content piece has no content to translate')
      );
    });

    it('should handle AI service errors', async () => {
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockContentPiece);
      mockPrismaService.translation.findUnique.mockResolvedValue(null);
      mockAiService.translateContent.mockRejectedValue(new Error('AI service unavailable'));

      await expect(service.generateTranslation(contentPieceId, generateDto)).rejects.toThrow('AI service unavailable');
    });
  });

  describe('generateTranslationForMyContent', () => {
    const userId = 'user-uuid';
    const contentPieceId = 'content-uuid';
    const generateDto: GenerateTranslationDto = {
      language: 'Italian',
    };

    const mockUserContent = {
      id: contentPieceId,
      createdById: userId,
      status: ContentStatus.APPROVED,
      content: 'Hello world',
    };

    it('should generate translation for user\'s content', async () => {
      const mockTranslation = {
        id: 'translation-uuid',
        contentPieceId,
        language: 'Italian',
        content: 'Ciao mondo',
        status: TranslationStatus.COMPLETED,
        aiModelUsed: 'gpt-4',
        tokensUsed: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        contentPiece: {
          id: contentPieceId,
          title: 'Test Content',
          type: 'SOCIAL_POST' as any,
          content: 'Hello world',
        },
      };

      mockPrismaService.contentPiece.findUnique.mockResolvedValue(mockUserContent);
      jest.spyOn(service, 'generateTranslation').mockResolvedValue(mockTranslation as any);

      const result = await service.generateTranslationForMyContent(contentPieceId, generateDto, userId);

      expect(result).toEqual(mockTranslation);
      expect(service.generateTranslation).toHaveBeenCalledWith(contentPieceId, generateDto);
    });

    it('should throw ForbiddenException when user does not own content', async () => {
      const otherUserContent = { ...mockUserContent, createdById: 'other-user' };
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(otherUserContent);

      await expect(service.generateTranslationForMyContent(contentPieceId, generateDto, userId)).rejects.toThrow(
        new ForbiddenException('You can only generate translations for your own content')
      );
    });

    it('should throw BadRequestException when content has no text', async () => {
      const contentWithoutText = { ...mockUserContent, content: null };
      mockPrismaService.contentPiece.findUnique.mockResolvedValue(contentWithoutText);

      await expect(service.generateTranslationForMyContent(contentPieceId, generateDto, userId)).rejects.toThrow(
        new BadRequestException('Content piece has no content to translate')
      );
    });
  });

  describe('getMyTranslations', () => {
    const userId = 'user-uuid';
    const mockTranslations = [
      {
        id: 'translation-1',
        language: 'Spanish',
        contentPiece: {
          id: 'content-1',
          title: 'Content 1',
          type: 'SOCIAL_POST',
          content: 'Original content',
        },
      },
    ];

    it('should return translations for user\'s content', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue(mockTranslations);

      const result = await service.getMyTranslations(userId);

      expect(result).toEqual(mockTranslations);
      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith({
        where: {
          contentPiece: {
            createdById: userId,
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          contentPiece: {
            select: {
              id: true,
              title: true,
              type: true,
              content: true,
            },
          },
        },
      });
    });

    it('should filter by language', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue(mockTranslations);

      await service.getMyTranslations(userId, 'Spanish');

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith({
        where: {
          contentPiece: {
            createdById: userId,
          },
          language: 'Spanish',
        },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.translation.findMany.mockResolvedValue(mockTranslations);

      await service.getMyTranslations(userId, undefined, TranslationStatus.COMPLETED);

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith({
        where: {
          contentPiece: {
            createdById: userId,
          },
          status: TranslationStatus.COMPLETED,
        },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    const translationId = 'translation-uuid';
    const updateDto: UpdateTranslationDto = {
      content: 'Updated translation content',
      status: TranslationStatus.COMPLETED,
    };

    const mockTranslation = {
      id: translationId,
      language: 'Spanish',
      content: 'Old content',
      status: TranslationStatus.PENDING,
      contentPiece: {
        id: 'content-uuid',
        title: 'Test Content',
        type: 'SOCIAL_POST',
        content: 'Original content',
        campaign: {
          id: 'campaign-uuid',
          name: 'Test Campaign',
        },
      },
    };

    const mockUpdatedTranslation = {
      ...mockTranslation,
      ...updateDto,
    };

    it('should update translation successfully', async () => {
      mockPrismaService.translation.findUnique.mockResolvedValue(mockTranslation);
      mockPrismaService.translation.update.mockResolvedValue(mockUpdatedTranslation);

      const result = await service.update(translationId, updateDto);

      expect(result).toEqual(mockUpdatedTranslation);
      expect(mockPrismaService.translation.update).toHaveBeenCalledWith({
        where: { id: translationId },
        data: updateDto,
        include: {
          contentPiece: {
            select: {
              id: true,
              title: true,
              type: true,
              content: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when translation not found', async () => {
      mockPrismaService.translation.findUnique.mockResolvedValue(null);

      await expect(service.update(translationId, updateDto)).rejects.toThrow(
        new NotFoundException(`Translation with ID ${translationId} not found`)
      );
    });
  });

  describe('remove', () => {
    const translationId = 'translation-uuid';
    const mockTranslation = {
      id: translationId,
      language: 'Spanish',
      content: 'Translation content',
    };

    it('should delete translation successfully', async () => {
      mockPrismaService.translation.findUnique.mockResolvedValue(mockTranslation);
      mockPrismaService.translation.delete.mockResolvedValue(mockTranslation);

      const result = await service.remove(translationId);

      expect(result).toEqual(mockTranslation);
      expect(mockPrismaService.translation.delete).toHaveBeenCalledWith({
        where: { id: translationId },
      });
    });

    it('should throw NotFoundException when translation not found', async () => {
      mockPrismaService.translation.findUnique.mockResolvedValue(null);

      await expect(service.remove(translationId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyTranslation', () => {
    const userId = 'user-uuid';
    const translationId = 'translation-uuid';
    const mockTranslation = {
      id: translationId,
      language: 'Spanish',
      contentPiece: {
        id: 'content-uuid',
        title: 'Test Content',
        type: 'SOCIAL_POST',
        content: 'Original content',
        campaign: {
          id: 'campaign-uuid',
          name: 'Test Campaign',
        },
      },
    };

    it('should return translation for user\'s content', async () => {
      mockPrismaService.translation.findFirst.mockResolvedValue(mockTranslation);

      const result = await service.getMyTranslation(translationId, userId);

      expect(result).toEqual(mockTranslation);
      expect(mockPrismaService.translation.findFirst).toHaveBeenCalledWith({
        where: {
          id: translationId,
          contentPiece: {
            createdById: userId,
          },
        },
        include: {
          contentPiece: {
            select: {
              id: true,
              title: true,
              type: true,
              content: true,
              campaign: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    it('should throw NotFoundException when translation not found or not authorized', async () => {
      mockPrismaService.translation.findFirst.mockResolvedValue(null);

      await expect(service.getMyTranslation(translationId, userId)).rejects.toThrow(
        new NotFoundException(`Translation with ID ${translationId} not found or you're not authorized to view it`)
      );
    });
  });

  describe('removeMyTranslation', () => {
    const userId = 'user-uuid';
    const translationId = 'translation-uuid';
    const mockTranslation = {
      id: translationId,
      language: 'Spanish',
      contentPiece: {
        createdById: userId,
      },
    };

    it('should delete user\'s translation successfully', async () => {
      mockPrismaService.translation.findFirst.mockResolvedValue(mockTranslation);
      mockPrismaService.translation.delete.mockResolvedValue(mockTranslation);

      const result = await service.removeMyTranslation(translationId, userId);

      expect(result).toEqual(mockTranslation);
      expect(mockPrismaService.translation.findFirst).toHaveBeenCalledWith({
        where: {
          id: translationId,
          contentPiece: {
            createdById: userId,
          },
        },
      });
      expect(mockPrismaService.translation.delete).toHaveBeenCalledWith({
        where: { id: translationId },
      });
    });

    it('should throw NotFoundException when translation not found or not authorized', async () => {
      mockPrismaService.translation.findFirst.mockResolvedValue(null);

      await expect(service.removeMyTranslation(translationId, userId)).rejects.toThrow(
        new NotFoundException(`Translation with ID ${translationId} not found or you're not authorized to delete it`)
      );
    });
  });
});
