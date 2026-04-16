import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';

@ApiTags('Content Pieces')
@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('campaigns/:campaignId/content')
  @ApiOperation({ summary: 'Create a content piece within a campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  create(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateContentPieceDto,
  ) {
    return this.contentService.create(campaignId, dto);
  }

  @Get('campaigns/:campaignId/content')
  @ApiOperation({ summary: 'List content pieces for a campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  findByCampaign(@Param('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.contentService.findByCampaign(campaignId);
  }

  @Get('content/:id')
  @ApiOperation({ summary: 'Get a content piece with its drafts' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findOne(id);
  }

  @Patch('content/:id')
  @ApiOperation({ summary: 'Update a content piece' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContentPieceDto) {
    return this.contentService.update(id, dto);
  }

  @Delete('content/:id')
  @ApiOperation({ summary: 'Delete a content piece' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id);
  }
}
