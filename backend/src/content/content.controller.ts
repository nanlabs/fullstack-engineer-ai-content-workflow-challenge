import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ReviewContentDto } from './dto/review-content.dto';

@Controller('campaigns/:campaignId/content')
export class ContentController {
  private readonly logger = new Logger(ContentController.name);

  constructor(private readonly contentService: ContentService) {}

  @Get()
  findAll(@Param('campaignId') campaignId: string) {
    this.logger.log(`GET /campaigns/${campaignId}/content`);
    return this.contentService.findAllForCampaign(campaignId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('campaignId') campaignId: string,
    @Body() createContentDto: CreateContentDto,
  ) {
    this.logger.log(`POST /campaigns/${campaignId}/content`);
    return this.contentService.create(campaignId, createContentDto);
  }

  @Get(':id')
  findOne(@Param('campaignId') campaignId: string, @Param('id') id: string) {
    this.logger.log(`GET /campaigns/${campaignId}/content/${id}`);
    return this.contentService.findOne(campaignId, id);
  }

  @Put(':id')
  update(
    @Param('campaignId') campaignId: string,
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    this.logger.log(`PUT /campaigns/${campaignId}/content/${id}`);
    return this.contentService.update(campaignId, id, updateContentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('campaignId') campaignId: string, @Param('id') id: string) {
    this.logger.log(`DELETE /campaigns/${campaignId}/content/${id}`);
    return this.contentService.remove(campaignId, id);
  }

  // Review state transition: DRAFT → AI_SUGGESTED → UNDER_REVIEW → APPROVED/REJECTED
  @Post(':id/review')
  review(
    @Param('campaignId') campaignId: string,
    @Param('id') id: string,
    @Body() reviewContentDto: ReviewContentDto,
  ) {
    this.logger.log(`POST /campaigns/${campaignId}/content/${id}/review`);
    return this.contentService.review(campaignId, id, reviewContentDto);
  }

  @Post(':id/select-draft/:draftId')
  selectDraft(
    @Param('campaignId') campaignId: string,
    @Param('id') id: string,
    @Param('draftId') draftId: string,
  ) {
    this.logger.log(`POST /campaigns/${campaignId}/content/${id}/select-draft/${draftId}`);
    return this.contentService.selectDraft(campaignId, id, draftId);
  }
}
