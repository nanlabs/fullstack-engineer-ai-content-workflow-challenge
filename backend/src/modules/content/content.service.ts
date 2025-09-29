import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { CreateContentForCampaignDto } from './dto/create-content-for-campaign.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { GenerateAiContentDto } from './dto/generate-ai-content.dto';
import { ContentStatus } from '@prisma/client';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async create(createContentDto: CreateContentDto, userId: string) {
    // Verify campaign exists and belongs to user
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: createContentDto.campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${createContentDto.campaignId} not found`);
    }

    if (campaign.createdById !== userId) {
      throw new ForbiddenException('You can only create content for your own campaigns');
    }

    return this.prisma.contentPiece.create({
      data: {
        ...createContentDto,
        createdById: userId,
        status: createContentDto.status || ContentStatus.DRAFT,
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
  }

  async findAll(userId: string, campaignId?: string, status?: ContentStatus) {
    const where = {
      createdById: userId,
      ...(campaignId && { campaignId }),
      ...(status && { status }),
    };

    return this.prisma.contentPiece.findMany({
      where,
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
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        translations: true,
      },
    });
  }

  async findOne(id: string, userId: string) {
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id },
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
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        translations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${id} not found`);
    }

    if (contentPiece.createdById !== userId) {
      throw new ForbiddenException('You can only access your own content');
    }

    return contentPiece;
  }

  async update(id: string, updateContentDto: UpdateContentDto, userId: string) {
    const contentPiece = await this.findOne(id, userId);

    // Validate business rules for status changes
    if (updateContentDto.status) {
      this.validateStatusTransition(contentPiece.status, updateContentDto.status);
    }

    try {
      return await this.prisma.contentPiece.update({
        where: { id },
        data: updateContentDto,
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
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    const contentPiece = await this.findOne(id, userId);

    return this.prisma.contentPiece.delete({
      where: { id },
    });
  }

  async generateAiContent(id: string, generateDto: GenerateAiContentDto, userId: string) {
    const contentPiece = await this.findOne(id, userId);

    // For this demo, we'll simulate AI generation
    const simulatedAiContent = this.simulateAiGeneration(generateDto.prompt, contentPiece.type);

    return this.prisma.contentPiece.update({
      where: { id },
      data: {
        content: simulatedAiContent,
        status: ContentStatus.AI_GENERATED,
        aiGenerated: true,
        promptUsed: generateDto.prompt,
        aiModelUsed: generateDto.model,
        tokensUsed: Math.floor(Math.random() * 200) + 50, // Random tokens for demo
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
  }

  private simulateAiGeneration(prompt: string, type: string): string {
    // Simple AI simulation for demo purposes
    const templates = {
      SOCIAL_POST: `🌟 Exciting news! ${prompt.toLowerCase().includes('summer') ? 'Our summer collection is here!' : 'Check out our latest products!'} ✨ Don't miss out on this amazing opportunity! #NewLaunch #ExcitingNews`,
      EMAIL_SUBJECT: `Don't Miss Out: ${prompt.toLowerCase().includes('summer') ? 'Summer Sale' : 'Special Offer'} Inside!`,
      EMAIL_BODY: `Dear valued customer,\n\nWe're excited to share some amazing news with you! Based on your request: "${prompt.slice(0, 50)}..."\n\nOur team has crafted something special just for you.\n\nBest regards,\nThe ACME Team`,
      BLOG_POST: `# ${prompt.toLowerCase().includes('summer') ? 'Summer Trends' : 'Latest Insights'}\n\nWelcome to our latest blog post! Here's what we've been working on:\n\n${prompt}\n\nStay tuned for more updates!`,
      AD_COPY: `Transform Your Experience! ${prompt.toLowerCase().includes('summer') ? '🌞 Summer Special' : '🚀 Limited Time'} - Act Now!`,
      AD_HEADLINE: prompt.toLowerCase().includes('summer') ? '🌞 Summer Sale: Up to 50% Off!' : '🚀 Revolutionary Products Await!',
      PRODUCT_DESCRIPTION: `Premium quality meets innovative design. ${prompt.slice(0, 100)}... Experience the difference today!`
    };

    return templates[type as keyof typeof templates] || `Generated content based on: ${prompt}`;
  }

  private validateStatusTransition(currentStatus: ContentStatus, newStatus: ContentStatus) {
    // Define valid status transitions
    const validTransitions: { [key: string]: ContentStatus[] } = {
      [ContentStatus.DRAFT]: [ContentStatus.REVIEW, ContentStatus.AI_GENERATED],
      [ContentStatus.AI_GENERATED]: [ContentStatus.REVIEW, ContentStatus.DRAFT],
      [ContentStatus.REVIEW]: [ContentStatus.APPROVED, ContentStatus.REJECTED, ContentStatus.DRAFT],
      [ContentStatus.APPROVED]: [ContentStatus.REVIEW], // Can be sent back for review
      [ContentStatus.REJECTED]: [ContentStatus.DRAFT, ContentStatus.REVIEW],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change status from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`
      );
    }
  }

  // Methods for campaign-scoped operations
  async createForCampaign(campaignId: string, createContentDto: CreateContentForCampaignDto, userId: string) {
    // Verify campaign exists and belongs to user
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.createdById !== userId) {
      throw new ForbiddenException('You can only create content for your own campaigns');
    }

    return this.prisma.contentPiece.create({
      data: {
        campaignId,
        ...createContentDto,
        createdById: userId,
        status: createContentDto.status || ContentStatus.DRAFT,
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
  }

  async findAllForCampaign(campaignId: string, userId: string) {
    // Verify campaign belongs to user
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { createdById: true },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.createdById !== userId) {
      throw new ForbiddenException('You can only view content for your own campaigns');
    }

    return this.prisma.contentPiece.findMany({
      where: { 
        campaignId,
        createdById: userId
      },
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
      },
    });
  }

}
