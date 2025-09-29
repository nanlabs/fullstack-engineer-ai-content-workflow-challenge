import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { GenerateTranslationsDto } from './dto/generate-translations.dto';
import { TranslationStatus, ContentStatus } from '@prisma/client';

@Injectable()
export class TranslationsService {
  constructor(private prisma: PrismaService) {}

  async create(createTranslationDto: CreateTranslationDto) {
    // Verify content piece exists
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: createTranslationDto.contentPieceId },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${createTranslationDto.contentPieceId} not found`);
    }

    // Check if translation already exists for this language
    const existingTranslation = await this.prisma.translation.findUnique({
      where: {
        contentPieceId_language: {
          contentPieceId: createTranslationDto.contentPieceId,
          language: createTranslationDto.language,
        },
      },
    });

    if (existingTranslation) {
      throw new BadRequestException(
        `Translation already exists for language '${createTranslationDto.language}'`
      );
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

    // Check if translation already exists for this language
    const existingTranslation = await this.prisma.translation.findUnique({
      where: {
        contentPieceId_language: {
          contentPieceId,
          language: createTranslationDto.language,
        },
      },
    });

    if (existingTranslation) {
      throw new BadRequestException(
        `Translation already exists for language '${createTranslationDto.language}'`
      );
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

  async generateTranslations(contentPieceId: string, generateDto: GenerateTranslationsDto) {
    // Verify content piece exists and is approved
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${contentPieceId} not found`);
    }

    if (contentPiece.status !== ContentStatus.APPROVED) {
      throw new BadRequestException('Content must be APPROVED before translation');
    }

    if (!contentPiece.content) {
      throw new BadRequestException('Content piece has no content to translate');
    }

    const translations = [];
    
    for (const language of generateDto.languages) {
      try {
        // Check if translation already exists
        const existingTranslation = await this.prisma.translation.findUnique({
          where: {
            contentPieceId_language: {
              contentPieceId,
              language,
            },
          },
        });

        if (existingTranslation) {
          // Update existing translation
          const updated = await this.prisma.translation.update({
            where: { id: existingTranslation.id },
            data: {
              content: this.simulateTranslation(contentPiece.content, language),
              status: TranslationStatus.COMPLETED,
              aiModelUsed: generateDto.aiModelUsed || 'gpt-4',
              tokensUsed: Math.floor(Math.random() * 100) + 30,
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
          translations.push(updated);
        } else {
          // Create new translation
          const created = await this.prisma.translation.create({
            data: {
              contentPieceId,
              language,
              content: this.simulateTranslation(contentPiece.content, language),
              status: TranslationStatus.COMPLETED,
              aiModelUsed: generateDto.aiModelUsed || 'gpt-4',
              tokensUsed: Math.floor(Math.random() * 100) + 30,
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
          translations.push(created);
        }
      } catch (error) {
        console.error(`Failed to generate translation for language ${language}:`, error);
      }
    }

    return translations;
  }

  async generateTranslationsForMyContent(contentPieceId: string, generateDto: GenerateTranslationsDto, userId: string) {
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

    if (contentPiece.status !== ContentStatus.APPROVED) {
      throw new BadRequestException('Content must be APPROVED before translation');
    }

    if (!contentPiece.content) {
      throw new BadRequestException('Content piece has no content to translate');
    }

    return this.generateTranslations(contentPieceId, generateDto);
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

  private simulateTranslation(originalContent: string, targetLanguage: string): string {
    // Simple translation simulation for demo purposes
    const translations = {
      'es': {
        'Summer': 'Verano',
        'Check out': 'Echa un vistazo',
        'Amazing': 'Increíble',
        'Product': 'Producto',
        'Launch': 'Lanzamiento',
        'New': 'Nuevo',
        'Special': 'Especial',
        'Offer': 'Oferta',
        'Don\'t miss': 'No te pierdas',
      },
      'fr': {
        'Summer': 'Été',
        'Check out': 'Découvrez',
        'Amazing': 'Incroyable',
        'Product': 'Produit',
        'Launch': 'Lancement',
        'New': 'Nouveau',
        'Special': 'Spécial',
        'Offer': 'Offre',
        'Don\'t miss': 'Ne manquez pas',
      },
      'de': {
        'Summer': 'Sommer',
        'Check out': 'Schauen Sie sich an',
        'Amazing': 'Erstaunlich',
        'Product': 'Produkt',
        'Launch': 'Start',
        'New': 'Neu',
        'Special': 'Besondere',
        'Offer': 'Angebot',
        'Don\'t miss': 'Verpassen Sie nicht',
      }
    };

    let translatedContent = originalContent;
    const languageTranslations = translations[targetLanguage as keyof typeof translations];

    if (languageTranslations) {
      Object.entries(languageTranslations).forEach(([english, translated]) => {
        const regex = new RegExp(english, 'gi');
        translatedContent = translatedContent.replace(regex, translated);
      });
    }

    return `[${targetLanguage.toUpperCase()}] ${translatedContent}`;
  }
}
