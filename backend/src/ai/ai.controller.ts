import { Controller, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { GenerateDto } from './dto/generate.dto';
import { TranslateDto } from './dto/translate.dto';
import { ExtractDto } from './dto/extract.dto';

@ApiTags('AI')
@Controller('content/:contentId')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate AI content for a content piece',
    description: 'Uses the selected AI provider to generate marketing content. Use "both" to compare OpenAI vs Anthropic outputs.',
  })
  @ApiParam({ name: 'contentId', type: 'string', format: 'uuid' })
  generate(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: GenerateDto,
  ) {
    return this.aiService.generate(contentId, dto.provider, {
      tone: dto.tone,
      style: dto.style,
    });
  }

  @Post('translate')
  @ApiOperation({
    summary: 'Translate content to target languages',
    description: 'Translates the content piece text into one or more target languages.',
  })
  @ApiParam({ name: 'contentId', type: 'string', format: 'uuid' })
  translate(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: TranslateDto,
  ) {
    return this.aiService.translate(contentId, dto.targetLanguages, dto.provider);
  }

  @Post('extract')
  @ApiOperation({
    summary: 'Extract metadata from content',
    description: 'Analyzes the content and extracts keywords, tone, sentiment, and summary.',
  })
  @ApiParam({ name: 'contentId', type: 'string', format: 'uuid' })
  extract(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: ExtractDto,
  ) {
    return this.aiService.extract(contentId, dto.provider || 'openai');
  }

  @Post('pipeline')
  @ApiOperation({
    summary: 'Run full AI pipeline: generate → translate → extract',
    description: 'Generates content, translates to all campaign target languages, and extracts metadata in one call.',
  })
  @ApiParam({ name: 'contentId', type: 'string', format: 'uuid' })
  pipeline(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: ExtractDto,
  ) {
    return this.aiService.pipeline(contentId, dto.provider || 'openai');
  }
}
