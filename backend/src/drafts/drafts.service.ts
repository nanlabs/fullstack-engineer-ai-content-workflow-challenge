import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DraftsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param contentPieceId - Parent content piece UUID
   * @returns All AI drafts for the content piece, most recent first
   */
  async findByContentPiece(contentPieceId: string) {
    return this.prisma.aiDraft.findMany({
      where: { contentPieceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * @param id - Draft UUID
   * @returns The draft with parent content piece and campaign context
   * @throws NotFoundException if not found
   */
  async findOne(id: string) {
    const draft = await this.prisma.aiDraft.findUnique({
      where: { id },
      include: {
        contentPiece: {
          include: {
            campaign: {
              select: { id: true, name: true, targetLanguages: true, sourceLanguage: true },
            },
          },
        },
      },
    });

    if (!draft) {
      throw new NotFoundException(`Draft with id "${id}" not found`);
    }

    return draft;
  }
}
