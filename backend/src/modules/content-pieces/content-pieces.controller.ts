import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ContentPiecesService } from './content-pieces.service';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';

@Controller('content-pieces')
export class ContentPiecesController {
  constructor(private readonly contentPiecesService: ContentPiecesService) {}

  @Post()
  create(@Body() createContentPieceDto: CreateContentPieceDto) {
    return this.contentPiecesService.create(createContentPieceDto);
  }

  @Get()
  findAll(@Query('campaignId') campaignId?: string) {
    if (campaignId) {
      return this.contentPiecesService.findByCampaign(campaignId);
    }
    return this.contentPiecesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentPiecesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContentPieceDto: UpdateContentPieceDto) {
    return this.contentPiecesService.update(id, updateContentPieceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contentPiecesService.remove(id);
  }
}
