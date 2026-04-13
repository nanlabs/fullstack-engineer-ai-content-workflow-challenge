import { Controller, Patch, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { ApproveDraftDto, RejectDraftDto } from './dto/review-draft.dto';
import { BulkApproveDto } from './dto/bulk-review.dto';

@ApiTags('Review')
@Controller('drafts')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Patch(':id/review')
  @ApiOperation({ summary: 'Mark a draft as reviewed' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  markReviewed(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.markReviewed(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a reviewed draft with optional edits' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveDraftDto) {
    return this.reviewService.approve(id, dto.editedText);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a reviewed draft with feedback' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectDraftDto) {
    return this.reviewService.reject(id, dto.reviewerNotes);
  }

  @Patch(':id/reset')
  @ApiOperation({ summary: 'Reset a rejected draft back to draft state' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  reset(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.reset(id);
  }

  @Post('bulk-approve')
  @ApiOperation({ summary: 'Bulk approve multiple drafts at once' })
  bulkApprove(@Body() dto: BulkApproveDto) {
    return this.reviewService.bulkApprove(dto.draftIds);
  }
}
