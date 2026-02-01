import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('campaigns/:id/content')
  create(
    @Param('id') campaignId: string,
    @Body() payload: CreateContentPieceDto,
  ) {
    return this.contentService.create(campaignId, payload);
  }

  @Get('content/:id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @Patch('content/:id')
  update(@Param('id') id: string, @Body() payload: UpdateContentPieceDto) {
    return this.contentService.update(id, payload);
  }

  @Delete('content/:id')
  remove(@Param('id') id: string) {
    return this.contentService.remove(id);
  }
}
