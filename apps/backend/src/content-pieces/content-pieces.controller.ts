import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  NotFoundException,
  ParseUUIDPipe,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ContentPiecesService } from './content-pieces.service';
import { ContentPiece } from './content-piece.entity';
import { CreateContentPieceDto } from './dto/create-content-piece.dto';
import { UpdateContentPieceDto } from './dto/update-content-piece.dto';
import { GenerateContentDto } from './dto/generate-content.dto';
import { ModelProvider } from 'src/langchain/langchain.enum';
import { ReviewState } from './review-state.enum';

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
  async findAll(@Query('campaignId') campaignId: string): Promise<ContentPiece[]> {
    return this.contentPiecesService.findAll(campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a content piece by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the content piece' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<ContentPiece> {
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
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateContentPieceDto: UpdateContentPieceDto,
  ): Promise<ContentPiece> {
    return this.contentPiecesService.update(id, updateContentPieceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a content piece by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the content piece to delete' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<ContentPiece> {
    return this.contentPiecesService.remove(id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate content for a content piece' })
  async generateContent(@Body() generateContentDto: GenerateContentDto): Promise<ContentPiece> {
    const { id, campaignId, locale, modelProvider } = generateContentDto;
    let provider: ModelProvider;

    if (!['openai', 'anthropic'].includes(modelProvider)) {
      throw new BadRequestException('modelProvider must be either "openai" or "anthropic"');
    } else {
      provider = modelProvider as ModelProvider;
    }

    try {
      if (id) {
        return await this.contentPiecesService.generateForExistingContent(id, locale, provider);
      } else {
        if (!campaignId) throw new BadRequestException('campaignId is required when id is not provided');

        return await this.contentPiecesService.generateForNewContent(campaignId, locale, provider);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      throw new BadRequestException(error || 'Error generating content');
    }
  }

  // Approve or Reject content endpoints
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a content piece by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the content piece to approve' })
  async approveContent(@Param('id', new ParseUUIDPipe()) id: string): Promise<ContentPiece> {
    return await this.contentPiecesService.update(id, {
      reviewState: ReviewState.Approved,
    });
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a content piece by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the content piece to reject' })
  async rejectContent(@Param('id', new ParseUUIDPipe()) id: string): Promise<ContentPiece> {
    return await this.contentPiecesService.update(id, {
      reviewState: ReviewState.Rejected,
    });
  }

  // Update to 'Reviewed' state
  @Post(':id/reviewed')
  @ApiOperation({ summary: "Mark a content piece as 'Reviewed' by ID" })
  @ApiParam({ name: 'id', description: 'The ID of the content piece to mark as reviewed' })
  async markAsReviewed(@Param('id', new ParseUUIDPipe()) id: string): Promise<ContentPiece> {
    return await this.contentPiecesService.update(id, {
      reviewState: ReviewState.Reviewed,
    });
  }
}
