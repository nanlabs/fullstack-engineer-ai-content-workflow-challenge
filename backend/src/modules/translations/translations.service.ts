import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { GenerateTranslationDto } from './dto/generate-translations.dto';
import { RegenerateTranslationDto } from './dto/regenerate-translation.dto';
import { TranslationStatus, ContentStatus } from '@prisma/client';

@Injectable()
export class TranslationsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async create(createTranslationDto: CreateTranslationDto) {
    // Verify content piece exists
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: createTranslationDto.contentPieceId },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${createTranslationDto.contentPieceId} not found`);
    }

    return this.prisma.translation.create({
      data: {
        ...createTranslationDto,
        status: createTranslationDto.status || TranslationStatus.PENDING,
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
  }

  async createForMyContent(contentPieceId: string, createTranslationDto: Omit<CreateTranslationDto, 'contentPieceId'>, userId: string) {
    // Verify the user owns the content piece
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      select: { createdById: true },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${contentPieceId} not found`);
    }

    if (contentPiece.createdById !== userId) {
      throw new ForbiddenException('You can only create translations for your own content');
    }

    return this.prisma.translation.create({
      data: {
        contentPieceId,
        ...createTranslationDto,
        status: createTranslationDto.status || TranslationStatus.PENDING,
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
  }

  async findAll(contentPieceId?: string, language?: string, status?: TranslationStatus) {
    const where = {
      ...(contentPieceId && { contentPieceId }),
      ...(language && { language }),
      ...(status && { status }),
    };

    return this.prisma.translation.findMany({
      where,
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
  }

  async findOne(id: string) {
    const translation = await this.prisma.translation.findUnique({
      where: { id },
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

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }

    return translation;
  }

  async update(id: string, updateTranslationDto: UpdateTranslationDto) {
    const translation = await this.findOne(id);

    return this.prisma.translation.update({
      where: { id },
      data: updateTranslationDto,
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
  }

  async remove(id: string) {
    const translation = await this.findOne(id);

    return this.prisma.translation.delete({
      where: { id },
    });
  }

  async generateTranslation(contentPieceId: string, generateDto: GenerateTranslationDto) {
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${contentPieceId} not found`);
    }

    if (!contentPiece.content) {
      throw new BadRequestException('Content piece has no content to translate');
    }

    try {
      // Generate translation using AI service
      const aiResponse = await this.aiService.translateContent({
        content: contentPiece.content,
        targetLanguage: generateDto.language,
        context: generateDto.context,
        model: generateDto.aiModelUsed || 'gpt-3.5-turbo',
      });

      // Create new translation
      return await this.prisma.translation.create({
        data: {
          contentPieceId,
          language: generateDto.language,
          content: aiResponse.content,
          status: TranslationStatus.COMPLETED,
          aiModelUsed: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
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
    } catch (error) {
      console.error(`Failed to generate translation for ${generateDto.language}:`, error);
      throw error;
    }
  }

  async generateTranslationForMyContent(contentPieceId: string, generateDto: GenerateTranslationDto, userId: string) {
    // Verify the user owns the content piece
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      select: { 
        createdById: true, 
        status: true,
        content: true 
      },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${contentPieceId} not found`);
    }

    if (contentPiece.createdById !== userId) {
      throw new ForbiddenException('You can only generate translations for your own content');
    }

    if (!contentPiece.content) {
      throw new BadRequestException('Content piece has no content to translate');
    }

    return this.generateTranslation(contentPieceId, generateDto);
  }

  async findAllForContent(contentPieceId: string, userId: string) {
    // Verify the user owns the content piece
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      select: { createdById: true },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${contentPieceId} not found`);
    }

    if (contentPiece.createdById !== userId) {
      throw new ForbiddenException('You can only view translations for your own content');
    }

    return this.prisma.translation.findMany({
      where: { contentPieceId },
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
  }

  // Methods for user-scoped operations
  async getMyTranslations(userId: string, language?: string, status?: TranslationStatus) {
    const where = {
      contentPiece: {
        createdById: userId, // Only translations of user's own content
      },
      ...(language && { language }),
      ...(status && { status }),
    };

    return this.prisma.translation.findMany({
      where,
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
  }

  async getMyTranslation(id: string, userId: string) {
    const translation = await this.prisma.translation.findFirst({
      where: { 
        id,
        contentPiece: {
          createdById: userId, // Only user's own content translations
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

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found or you're not authorized to view it`);
    }

    return translation;
  }

  async updateMyTranslation(id: string, updateTranslationDto: UpdateTranslationDto, userId: string) {
    // Verify the user owns the content piece of this translation
    const existingTranslation = await this.prisma.translation.findFirst({
      where: { 
        id,
        contentPiece: {
          createdById: userId,
        },
      },
    });

    if (!existingTranslation) {
      throw new NotFoundException(`Translation with ID ${id} not found or you're not authorized to update it`);
    }

    return this.prisma.translation.update({
      where: { id },
      data: updateTranslationDto,
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
  }

  async removeMyTranslation(id: string, userId: string) {
    // Verify the user owns the content piece of this translation
    const translation = await this.prisma.translation.findFirst({
      where: { 
        id,
        contentPiece: {
          createdById: userId,
        },
      },
    });

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found or you're not authorized to delete it`);
    }

    return this.prisma.translation.delete({
      where: { id },
    });
  }

  async regenerateTranslation(id: string, regenerateDto: RegenerateTranslationDto, userId: string) {
    const translation = await this.getMyTranslation(id, userId);

    if (!translation.content) {
      throw new BadRequestException('Can only regenerate translations that have existing content');
    }

    try {
      // Save current version as backup if requested
      if (regenerateDto.keepHistory !== false) {
        // Here you would typically save to a history table
        // For now, we'll just log it
        console.log(`Backing up version for translation ${id}:`, translation.content.substring(0, 100));
      }

      const aiResponse = await this.aiService.regenerateTranslation({
        originalContent: translation.contentPiece.content,
        currentTranslation: translation.content,
        feedback: regenerateDto.feedback,
        targetLanguage: translation.language,
        context: '', // Could be enhanced to store context in translation record
        model: regenerateDto.model,
      });

      return await this.prisma.translation.update({
        where: { id },
        data: {
          content: aiResponse.content,
          status: TranslationStatus.COMPLETED,
          aiModelUsed: aiResponse.model,
          tokensUsed: (translation.tokensUsed || 0) + aiResponse.tokensUsed, // Accumulate tokens
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
    } catch (error) {
      console.error('Translation regeneration failed:', error);
      throw error;
    }
  }
}
