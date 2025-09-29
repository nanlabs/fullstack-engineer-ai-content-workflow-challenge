import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Body,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TranslationsService } from './translations.service';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { RegenerateTranslationDto } from './dto/regenerate-translation.dto';
import { TranslationResponseDto } from './dto/translation-response.dto';
import { TranslationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiThrottle } from '../../common/decorators/ai-throttle.decorator';

@ApiTags('translations')
@Controller('translations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  @ApiOperation({ summary: 'Gettranslations with filters' })
  @ApiResponse({ status: 200, type: [TranslationResponseDto] })
  @ApiQuery({ name: 'language', required: false, description: 'Filter by language (e.g., en, es, fr, de)' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: TranslationStatus, 
    description: 'Filter by translation status (PENDING, COMPLETED, FAILED, REVIEWED)' 
  })
  getMyTranslations(
    @CurrentUser() user: { id: string },
    @Query('language') language?: string,
    @Query('status') status?: TranslationStatus,
  ) {
    return this.translationsService.getMyTranslations(user.id, language, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Gettranslation by ID' })
  @ApiResponse({ status: 200, type: TranslationResponseDto })
  getMyTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.translationsService.getMyTranslation(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Updatetranslation by ID' })
  @ApiResponse({ status: 200, type: TranslationResponseDto })
  updateMyTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTranslationDto: UpdateTranslationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.translationsService.updateMyTranslation(id, updateTranslationDto, user.id);
  }

  @Post(':id/regenerate')
  @AiThrottle()
  @ApiOperation({ summary: 'Regenerate translation with feedback' })
  @ApiResponse({ status: 200, type: TranslationResponseDto })
  regenerateTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() regenerateDto: RegenerateTranslationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.translationsService.regenerateTranslation(id, regenerateDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletetranslation by ID' })
  @ApiResponse({ status: 200, type: TranslationResponseDto })
  removeMyTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.translationsService.removeMyTranslation(id, user.id);
  }
}
