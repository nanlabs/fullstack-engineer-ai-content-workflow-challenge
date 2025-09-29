import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { ContentService } from './content.service';
import { UpdateContentDto } from './dto/update-content.dto';
import { GenerateAiContentDto } from './dto/generate-ai-content.dto';
import { RegenerateAiContentDto } from '../ai/dto/regenerate-ai-content.dto';
import { ContentResponseDto } from './dto/content-response.dto';
import { CreateTranslationDto } from '../translations/dto/create-translation.dto';
import { GenerateTranslationDto } from '../translations/dto/generate-translations.dto';
import { TranslationResponseDto } from '../translations/dto/translation-response.dto';
import { TranslationsService } from '../translations/translations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiThrottle } from '../../common/decorators/ai-throttle.decorator';

@ApiTags('content')
@Controller('content')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly translationsService: TranslationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all content pieces with filters' })
  @ApiResponse({ status: 200, type: [ContentResponseDto] })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Filter by campaign ID' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: ContentStatus, 
    description: 'Filter by content status (DRAFT, AI_GENERATED, REVIEW, APPROVED, REJECTED)' 
  })
  findAll(
    @CurrentUser() user: { id: string },
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: ContentStatus,
  ) {
    return this.contentService.findAll(user.id, campaignId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content piece by ID' })
  @ApiResponse({ status: 200, type: ContentResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contentService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content piece by ID' })
  @ApiResponse({ status: 200, type: ContentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContentDto: UpdateContentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.contentService.update(id, updateContentDto, user.id);
  }

  @Post(':id/generate-ai')
  @AiThrottle()
  @ApiOperation({ summary: 'Generate AI content for a content piece' })
  @ApiResponse({ status: 200, type: ContentResponseDto })
  generateAiContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() generateDto: GenerateAiContentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.contentService.generateAiContent(id, generateDto, user.id);
  }

  @Post(':id/regenerate-ai')
  @AiThrottle()
  @ApiOperation({ summary: 'Regenerate AI content with feedback for a content piece' })
  @ApiResponse({ status: 200, type: ContentResponseDto })
  regenerateAiContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() regenerateDto: RegenerateAiContentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.contentService.regenerateAiContent(id, regenerateDto, user.id);
  }

  @Post(':id/translations')
  @ApiOperation({ summary: 'Create a translation forcontent piece' })
  @ApiResponse({ status: 201, type: TranslationResponseDto })
  createTranslationForMyContent(
    @Param('id', ParseUUIDPipe) contentPieceId: string,
    @Body() createTranslationDto: CreateTranslationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.translationsService.createForMyContent(contentPieceId, createTranslationDto, user.id);
  }

  @Post(':id/translations/generate')
  @AiThrottle()
  @ApiOperation({ summary: 'Generate AI translation for content piece' })
  @ApiResponse({ status: 201, type: TranslationResponseDto })
  generateTranslationForMyContent(
    @Param('id', ParseUUIDPipe) contentPieceId: string,
    @Body() generateDto: GenerateTranslationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.translationsService.generateTranslationForMyContent(contentPieceId, generateDto, user.id);
  }

  @Get(':id/translations')
  @ApiOperation({ summary: 'Get all translations forcontent piece' })
  @ApiResponse({ status: 200, type: [TranslationResponseDto] })
  getMyContentTranslations(
    @Param('id', ParseUUIDPipe) contentPieceId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.translationsService.findAllForContent(contentPieceId, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content piece by ID' })
  @ApiResponse({ status: 200, type: ContentResponseDto })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contentService.remove(id, user.id);
  }
}
