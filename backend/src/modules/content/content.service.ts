import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { CreateContentDto } from './dto/create-content.dto';
import { CreateContentForCampaignDto } from './dto/create-content-for-campaign.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { GenerateAiContentDto } from './dto/generate-ai-content.dto';
import { RegenerateAiContentDto } from '../ai/dto/regenerate-ai-content.dto';
import { ContentStatus } from '@prisma/client';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private eventsGateway: EventsGateway,
  ) {}

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

    const content = await this.prisma.contentPiece.create({
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

    // Emit WebSocket event
    this.eventsGateway.emitContentCreated(userId, content);

    return content;
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
      const updatedContent = await this.prisma.contentPiece.update({
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

      // Emit WebSocket event
      this.eventsGateway.emitContentUpdated(userId, updatedContent);

      // If status changed, emit specific status change event
      if (updateContentDto.status && updateContentDto.status !== contentPiece.status) {
        this.eventsGateway.emitContentStatusChanged(userId, id, updateContentDto.status, updatedContent);
      }

      return updatedContent;
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    const contentPiece = await this.findOne(id, userId);

    const result = await this.prisma.contentPiece.delete({
      where: { id },
    });

    // Emit WebSocket event
    this.eventsGateway.emitContentDeleted(userId, id);

    return result;
  }

  async generateAiContent(id: string, generateDto: GenerateAiContentDto, userId: string) {
    const contentPiece = await this.findOne(id, userId);

    try {
      // Generate content using AI service
      const aiResponse = await this.aiService.generateContent({
        prompt: generateDto.prompt,
        contentType: contentPiece.type,
        model: generateDto.model,
      });

      const updatedContent = await this.prisma.contentPiece.update({
        where: { id },
        data: {
          content: aiResponse.content,
          status: ContentStatus.AI_GENERATED,
          aiGenerated: true,
          promptUsed: aiResponse.promptUsed,
          aiModelUsed: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
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

      // Emit WebSocket events
      this.eventsGateway.emitContentAiGenerated(userId, updatedContent);
      this.eventsGateway.emitContentStatusChanged(userId, id, ContentStatus.AI_GENERATED, updatedContent);

      return updatedContent;
    } catch (error) {
      console.error('AI content generation failed:', error);
      throw error;
    }
  }

  async regenerateAiContent(id: string, regenerateDto: RegenerateAiContentDto, userId: string) {
    const contentPiece = await this.findOne(id, userId);

    if (!contentPiece.aiGenerated || !contentPiece.content || !contentPiece.promptUsed) {
      throw new BadRequestException('Can only regenerate AI-generated content that has existing content');
    }

    try {
      // Extract original prompt from the stored prompt (remove the system prompt part)
      const originalPrompt = contentPiece.promptUsed.split('Topic/Requirements: ')[1] || contentPiece.promptUsed;

      // Save current version as backup if requested
      if (regenerateDto.keepHistory !== false) {
        // Here you would typically save to a history table
        // For now, we'll just log it
        console.log(`Backing up version for content ${id}:`, contentPiece.content.substring(0, 100));
      }

      const aiResponse = await this.aiService.regenerateContent({
        originalPrompt,
        currentContent: contentPiece.content,
        feedback: regenerateDto.feedback,
        contentType: contentPiece.type,
        model: regenerateDto.model,
      });

      const updatedContent = await this.prisma.contentPiece.update({
        where: { id },
        data: {
          content: aiResponse.content,
          status: ContentStatus.AI_GENERATED, // Keep as AI_GENERATED for further iterations
          promptUsed: aiResponse.promptUsed,
          aiModelUsed: aiResponse.model,
          tokensUsed: (contentPiece.tokensUsed || 0) + aiResponse.tokensUsed, // Accumulate tokens
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

      // Emit WebSocket events
      this.eventsGateway.emitContentAiGenerated(userId, updatedContent);
      this.eventsGateway.emitContentUpdated(userId, updatedContent);

      return updatedContent;
    } catch (error) {
      console.error('AI content regeneration failed:', error);
      throw error;
    }
  }

  private validateStatusTransition(currentStatus: ContentStatus, newStatus: ContentStatus) {
    // Define valid status transitions
    const validTransitions: { [key: string]: ContentStatus[] } = {
      [ContentStatus.DRAFT]: [ContentStatus.AI_GENERATED, ContentStatus.APPROVED],
      [ContentStatus.AI_GENERATED]: [ContentStatus.DRAFT, ContentStatus.APPROVED, ContentStatus.REJECTED],
      [ContentStatus.REJECTED]: [ContentStatus.DRAFT],
      [ContentStatus.APPROVED]: [], // Final state, no transitions allowed
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

    const content = await this.prisma.contentPiece.create({
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

    // Emit WebSocket event
    this.eventsGateway.emitContentCreated(userId, content);

    return content;
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
