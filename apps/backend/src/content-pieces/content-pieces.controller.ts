import { Controller, Get, Post, Body, Param, Patch, Delete, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ContentPiecesService } from './content-pieces.service';
import { ContentPiece } from './content-piece.entity';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';

@ApiTags('content-pieces')
@Controller('content-pieces')
export class ContentPiecesController {
  constructor(private readonly contentPiecesService: ContentPiecesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new content piece' })
  async create(@Body() createContentPieceDto: CreateContentPieceDto): Promise<ContentPiece> {
    return this.contentPiecesService.create(createContentPieceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all content pieces' })
  async findAll(@Param('campaignId') campaignId: string | undefined): Promise<ContentPiece[]> {
    return this.contentPiecesService.findAll(campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a content piece by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the content piece' })
  async findOne(@Param('id') id: string): Promise<ContentPiece> {
    try {
      return await this.contentPiecesService.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a content piece by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the content piece to update' })
  async update(@Param('id') id: string, @Body() updateContentPieceDto: UpdateContentPieceDto): Promise<ContentPiece> {
    return this.contentPiecesService.update(id, updateContentPieceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a content piece by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the content piece to delete' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.contentPiecesService.remove(id);
  }
}
