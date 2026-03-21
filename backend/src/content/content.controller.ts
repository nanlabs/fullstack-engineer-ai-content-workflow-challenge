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
  UseGuards,
  Request,
} from '@nestjs/common';
import { ContentService } from './content.service';
import {
  CreateContentPieceDto,
  UpdateContentPieceDto,
  UpdateStatusDto,
} from './content.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('campaigns/:campaignId/content')
  create(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateContentPieceDto,
    @Request() req: any,
  ) {
    return this.contentService.create(campaignId, dto, req.user.id);
  }

  @Get('content/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.contentService.findOne(id, req.user.id);
  }

  @Put('content/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentPieceDto,
    @Request() req: any,
  ) {
    return this.contentService.update(id, dto, req.user.id);
  }

  @Patch('content/:id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Request() req: any,
  ) {
    return this.contentService.updateStatus(id, dto, req.user.id);
  }

  @Delete('content/:id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.contentService.remove(id, req.user.id);
  }
}
