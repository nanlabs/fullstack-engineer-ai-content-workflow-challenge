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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ContentPieceTranslationService } from './content-piece-translations.service';
import { ContentPieceTranslation } from './content-piece-translations.entity';
import { CreateContentPieceTranslationDto } from './dto/create-content-piece-translations.dto';
import { UpdateContentPieceTranslationDto } from './dto/update-content-piece-translations.dto';

@ApiTags('content-piece-translations')
@Controller('content-piece-translations')
export class ContentPieceTranslationController {
  constructor(private readonly translationService: ContentPieceTranslationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new content piece translation' })
  async create(@Body() createTranslationDto: CreateContentPieceTranslationDto): Promise<ContentPieceTranslation> {
    return this.translationService.create(createTranslationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all content piece translations' })
  async findAll(@Query('contentPieceId') contentPieceId: string | undefined): Promise<ContentPieceTranslation[]> {
    if (contentPieceId) {
      return this.translationService.findAll(contentPieceId);
    }

    return this.translationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a content piece translation by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the translation' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<ContentPieceTranslation> {
    try {
      return await this.translationService.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a content piece translation by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the translation to update' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateTranslationDto: UpdateContentPieceTranslationDto,
  ): Promise<ContentPieceTranslation> {
    return this.translationService.update(id, updateTranslationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a content piece translation by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the translation to delete' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<ContentPieceTranslation> {
    return this.translationService.remove(id);
  }
}
