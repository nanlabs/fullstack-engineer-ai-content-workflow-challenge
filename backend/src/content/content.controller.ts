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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContentService } from './content.service';
import {
  CreateContentPieceDto,
  UpdateContentPieceDto,
  UpdateStatusDto,
} from './content.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Content')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('campaigns/:campaignId/content')
  @ApiOperation({ summary: 'Create a content piece in a campaign' })
  create(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateContentPieceDto,
    @Request() req: any,
  ) {
    return this.contentService.create(campaignId, dto, req.user.id);
  }

  @Get('content/:id')
  @ApiOperation({ summary: 'Get content detail with translations' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.contentService.findOne(id, req.user.id);
  }

  @Put('content/:id')
  @ApiOperation({ summary: 'Update content body or review notes' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentPieceDto,
    @Request() req: any,
  ) {
    return this.contentService.update(id, dto, req.user.id);
  }

  @Patch('content/:id/status')
  @ApiOperation({ summary: 'Change content review status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Request() req: any,
  ) {
    return this.contentService.updateStatus(id, dto, req.user.id);
  }

  @Delete('content/:id')
  @ApiOperation({ summary: 'Delete a content piece' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.contentService.remove(id, req.user.id);
  }
}
