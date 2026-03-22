import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateDraftDto } from './dto/generate-draft.dto';
import { TranslateContentDto } from './dto/translate-content.dto';
import { AIModel } from '@prisma/client';

@Controller('campaigns/:campaignId/content/:contentId')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  generate(
    @Param('campaignId') campaignId: string,
    @Param('contentId') contentId: string,
    @Body() dto: GenerateDraftDto,
  ) {
    this.logger.log(`POST /campaigns/${campaignId}/content/${contentId}/generate`);
    return this.aiService.generateDraft(
      contentId,
      dto.model ?? AIModel.CLAUDE_3_5_SONNET,
      dto.prompt,
    );
  }

  @Post('translate')
  @HttpCode(HttpStatus.CREATED)
  translate(
    @Param('campaignId') campaignId: string,
    @Param('contentId') contentId: string,
    @Body() dto: TranslateContentDto,
  ) {
    this.logger.log(`POST /campaigns/${campaignId}/content/${contentId}/translate`);
    return this.aiService.translateContent(
      contentId,
      dto.targetLanguage,
      dto.model ?? AIModel.CLAUDE_3_5_SONNET,
    );
  }

  // Runs both Claude and GPT-4o in parallel and returns both drafts for comparison
  @Post('compare')
  @HttpCode(HttpStatus.CREATED)
  compare(
    @Param('campaignId') campaignId: string,
    @Param('contentId') contentId: string,
    @Body() dto: GenerateDraftDto,
  ) {
    this.logger.log(`POST /campaigns/${campaignId}/content/${contentId}/compare`);
    return this.aiService.compareModels(contentId, dto.prompt);
  }
}
