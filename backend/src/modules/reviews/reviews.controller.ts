import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Getreviews as reviewer with filters' })
  @ApiResponse({ status: 200, type: [ReviewResponseDto] })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: ReviewStatus, 
    description: 'Filter by review status (PENDING, APPROVED, REJECTED, CHANGES_REQUESTED)' 
  })
  getMyReviews(
    @CurrentUser() user: { id: string },
    @Query('status') status?: ReviewStatus,
  ) {
    return this.reviewsService.getMyReviews(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Getreview by ID' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  getMyReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviewsService.getMyReview(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Updatereview by ID' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  updateMyReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviewsService.updateMyReview(id, updateReviewDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletereview by ID' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  removeMyReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviewsService.removeMyReview(id, user.id);
  }
}
