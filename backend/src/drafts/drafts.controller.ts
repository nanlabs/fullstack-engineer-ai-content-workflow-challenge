import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { DraftsService } from './drafts.service';

@ApiTags('Drafts')
@Controller()
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Get('content/:contentId/drafts')
  @ApiOperation({ summary: 'List all AI drafts for a content piece' })
  @ApiParam({ name: 'contentId', type: 'string', format: 'uuid' })
  findByContentPiece(@Param('contentId', ParseUUIDPipe) contentId: string) {
    return this.draftsService.findByContentPiece(contentId);
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Get a single draft with context' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.draftsService.findOne(id);
  }
}
