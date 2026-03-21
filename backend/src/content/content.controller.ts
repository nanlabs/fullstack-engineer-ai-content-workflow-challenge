import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ContentService } from './content.service';
import {
  CreateContentPieceDto,
  UpdateContentPieceDto,
  UpdateStatusDto,
} from './content.dto';

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('campaigns/:campaignId/content')
  create(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateContentPieceDto,
  ) {
    return this.contentService.create(campaignId, dto);
  }

  @Get('content/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findOne(id);
  }

  @Put('content/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentPieceDto,
  ) {
    return this.contentService.update(id, dto);
  }

  @Patch('content/:id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.contentService.updateStatus(id, dto);
  }

  @Delete('content/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id);
  }
}
