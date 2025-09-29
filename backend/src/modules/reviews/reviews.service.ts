import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(contentPieceId: string, createReviewDto: CreateReviewDto, userId: string) {
    // Verify content piece exists
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${contentPieceId} not found`);
    }

    return this.prisma.review.create({
      data: {
        contentPieceId,
        ...createReviewDto,
        reviewerId: userId,
        reviewedAt: createReviewDto.status !== ReviewStatus.PENDING ? new Date() : null,
      },
      include: {
        contentPiece: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async createForMyContent(contentPieceId: string, createReviewDto: CreateReviewDto, userId: string) {
    // Verify the user owns the content piece
    const contentPiece = await this.prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      select: { createdById: true },
    });

    if (!contentPiece) {
      throw new NotFoundException(`Content piece with ID ${contentPieceId} not found`);
    }

    if (contentPiece.createdById !== userId) {
      throw new ForbiddenException('You can only create reviews for your own content');
    }

    return this.prisma.review.create({
      data: {
        contentPieceId,
        ...createReviewDto,
        reviewerId: userId,
        reviewedAt: createReviewDto.status !== ReviewStatus.PENDING ? new Date() : null,
      },
      include: {
        contentPiece: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(contentPieceId?: string, status?: ReviewStatus) {
    const where = {
      ...(contentPieceId && { contentPieceId }),
      ...(status && { status }),
    };

    return this.prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contentPiece: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        contentPiece: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            content: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.findOne(id);

    return this.prisma.review.update({
      where: { id },
      data: {
        ...updateReviewDto,
        reviewedAt: updateReviewDto.status !== ReviewStatus.PENDING ? new Date() : review.reviewedAt,
      },
      include: {
        contentPiece: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const review = await this.findOne(id);

    return this.prisma.review.delete({
      where: { id },
    });
  }

  async getPendingReviews() {
    return this.findAll(undefined, ReviewStatus.PENDING);
  }

  async getReviewsByReviewer(reviewerId: string) {
    return this.prisma.review.findMany({
      where: { reviewerId },
      orderBy: { createdAt: 'desc' },
      include: {
        contentPiece: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
      },
    });
  }

  async getMyReviews(reviewerId: string, status?: ReviewStatus) {
    const where = {
      reviewerId,
      ...(status && { status }),
    };

    return this.prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contentPiece: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
      },
    });
  }

  async getMyReview(id: string, userId: string) {
    const review = await this.prisma.review.findFirst({
      where: { 
        id,
        reviewerId: userId 
      },
      include: {
        contentPiece: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            content: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found or you're not authorized to view it`);
    }

    return review;
  }

  async updateMyReview(id: string, updateReviewDto: UpdateReviewDto, userId: string) {
    // Verify the user owns this review
    const existingReview = await this.prisma.review.findFirst({
      where: { 
        id,
        reviewerId: userId 
      },
    });

    if (!existingReview) {
      throw new NotFoundException(`Review with ID ${id} not found or you're not authorized to update it`);
    }

    return this.prisma.review.update({
      where: { id },
      data: {
        ...updateReviewDto,
        reviewedAt: updateReviewDto.status !== ReviewStatus.PENDING ? new Date() : existingReview.reviewedAt,
      },
      include: {
        contentPiece: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async removeMyReview(id: string, userId: string) {
    // Verify the user owns this review
    const review = await this.prisma.review.findFirst({
      where: { 
        id,
        reviewerId: userId 
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found or you're not authorized to delete it`);
    }

    return this.prisma.review.delete({
      where: { id },
    });
  }

  // Methods for content-scoped operations
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
      throw new ForbiddenException('You can only view reviews for your own content');
    }

    // Since users can only review their own content, this will return the user's reviews for their own content
    return this.prisma.review.findMany({
      where: { 
        contentPieceId,
        reviewerId: userId  // User can only see their own reviews
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
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
